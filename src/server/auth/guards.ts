/**
 * Responsabilidad del archivo:
 * - Resolver al usuario autenticado real desde el servidor y aplicar reglas de autorizacion.
 *
 * Papel en la arquitectura:
 * - Es la capa de seguridad definitiva para Server Components.
 * - Traduce una sesion valida de Better Auth en un usuario de dominio cargado desde Prisma,
 *   incluyendo relaciones que el dashboard necesita para renderizar y autorizar.
 *
 * Cuando participa:
 * - Layouts protegidos del dashboard.
 * - Paginas que necesitan el usuario actual.
 * - Reglas de rol y suscripcion.
 *
 * Por que existe:
 * - La sesion identifica al usuario, pero no reemplaza la consulta al modelo `User`.
 * - El rol y otras relaciones viven en PostgreSQL; por eso la autorizacion real ocurre aqui.
 */
import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PaymentStatus,
  Role,
  SubscriptionProduct,
  type Level,
  type Subscription,
  type User,
} from "@/generated/prisma/client";
import {
  evaluatePremiumAccess,
  getRequiredSubscriptionProduct,
  type PremiumAccessDecision,
} from "@/modules/subscriptions/domain/premium-access";
import { getDashboardPathForRole } from "@/modules/auth/lib/dashboard-path";
import { isUserCurrentlySuspended } from "@/modules/users/domain/user-suspension";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";

export type AuthenticatedUser = User & {
  subscriptions: Subscription[];
  selectedLevel: Level | null;
};

export type AuthGuardErrorCode =
  | "FORBIDDEN"
  | "SUBSCRIPTION_REQUIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_NOT_STARTED"
  | "SUBSCRIPTION_PRODUCT_MISMATCH"
  | "SUBSCRIPTION_PAYMENT_UNCONFIRMED";

export class AuthGuardError extends Error {
  constructor(
    public readonly code: AuthGuardErrorCode,
    message: string,
    public readonly status: 403 = 403,
  ) {
    super(message);
    this.name = "AuthGuardError";
  }
}

/**
 * Obtiene la sesion actual usando los encabezados del request activo.
 *
 * @returns La sesion de Better Auth o `null` si la cookie no representa una sesion valida.
 *
 * @remarks
 * - Lee cookies/headers del request actual, por eso solo debe ejecutarse del lado del servidor.
 * - Se memoiza por request con `cache()` para evitar resolver la misma sesion varias veces
 *   dentro del mismo render del dashboard.
 */
export const getCurrentSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Convierte la sesion actual en el usuario de dominio que usa la aplicacion.
 *
 * @returns El usuario autenticado con sus relaciones `subscriptions` y `selectedLevel`.
 * @redirect `/login` si no existe sesion valida o la identidad ya no existe.
 *
 * @remarks
 * - Consulta PostgreSQL a traves de Prisma.
 * - No expone contrasenas ni datos sensibles de `Account`; solo carga lo necesario para authz/UI.
 * - Se memoiza por request para que layout, pages y sublayouts compartan la misma lectura.
 */
export const requireUser = cache(async (): Promise<AuthenticatedUser> => {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscriptions: {
        orderBy: {
          createdAt: "desc",
        },
      },
      selectedLevel: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.deletedAt) {
    redirect("/login");
  }

  if (
    user.adminCreatedAt &&
    (user.passwordChangeRequired ||
      !user.ageVerifiedAt ||
      !user.termsAcceptedAt ||
      !user.privacyAcceptedAt)
  ) {
    redirect("/completar-cuenta");
  }

  if (!user.emailVerified) {
    redirect("/verify-email");
  }

  if (isUserCurrentlySuspended(user)) {
    redirect("/cuenta-suspendida");
  }

  return user;
});

export async function requireAccountSetupUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session?.user) redirect("/login");

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: {
      id: true,
      email: true,
      adminCreatedAt: true,
      passwordChangeRequired: true,
      ageVerifiedAt: true,
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
    },
  });

  if (!user) redirect("/login");

  const incomplete = Boolean(
    user.adminCreatedAt &&
      (user.passwordChangeRequired ||
        !user.ageVerifiedAt ||
        !user.termsAcceptedAt ||
        !user.privacyAcceptedAt),
  );
  if (!incomplete) redirect("/dashboard");

  return { user, session: session.session };
}

/**
 * Valida si el usuario autenticado pertenece a uno de los roles permitidos.
 *
 * @param allowedRoles Rol o lista de roles autorizados.
 * @returns El usuario autenticado si la autorizacion es valida.
 * @throws {AuthGuardError} `FORBIDDEN` cuando el rol del usuario no coincide.
 *
 * @remarks
 * - Sigue siendo util para acciones o rutas donde conviene fallar explicitamente.
 * - En el dashboard principal preferimos `requireExactRoleOrRedirect(...)` para evitar una UX
 *   basada en error boundaries cuando el usuario manipula la URL manualmente.
 */
export async function requireRole(allowedRoles: Role | Role[]) {
  const user = await requireUser();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw new AuthGuardError("FORBIDDEN", "No tienes permisos para esta accion.");
  }

  return user;
}

/**
 * Protege un subarbol del dashboard cuando cada area pertenece a un unico rol.
 *
 * @param expectedRole Rol exacto que puede acceder a la ruta actual.
 * @returns El usuario autenticado si coincide con el rol esperado.
 *
 * @remarks
 * - Redirige, no lanza error, porque una ruta de dashboard ajena no es un fallo inesperado:
 *   es un caso de navegacion valida pero no autorizada.
 * - La redireccion usa la ruta canonical del rol real del usuario para mantener la UX consistente.
 */
export async function requireExactRoleOrRedirect(expectedRole: Role) {
  const user = await requireUser();

  if (user.role !== expectedRole) {
    redirect(getDashboardPathForRole(user.role));
  }

  return user;
}

/**
 * Aplica una regla de negocio adicional sobre autenticacion: la suscripcion debe estar activa.
 *
 * @returns El usuario y su suscripcion activa.
 * @throws {AuthGuardError} `SUBSCRIPTION_REQUIRED` si el usuario no tiene suscripcion.
 * @throws {AuthGuardError} `SUBSCRIPTION_INACTIVE` si existe pero no esta activa.
 * @throws {AuthGuardError} `SUBSCRIPTION_EXPIRED` si la fecha final ya paso.
 *
 * @remarks
 * - Esta validacion es autorizacion de negocio, no autenticacion.
 * - Debe ejecutarse del lado del servidor para que un cliente no pueda saltarse la restriccion.
 */
export type PremiumAccessResult = {
  user: AuthenticatedUser;
  subscription: Subscription | null;
  decision: PremiumAccessDecision;
};

export async function getPremiumAccessDecision(
  requestedLevelId?: string | null,
): Promise<PremiumAccessResult> {
  const user = await requireUser();
  const requiredProduct = getRequiredSubscriptionProduct(user.role);
  const levelId = requestedLevelId ?? user.selectedLevelId;

  if (!requiredProduct || !levelId) {
    return {
      user,
      subscription: null,
      decision: { allowed: false, code: "ROLE_NOT_ELIGIBLE" },
    };
  }

  const level = await prisma.level.findUnique({
    where: { id: levelId },
    select: { isActive: true, requiresSubscription: true },
  });

  if (!level?.isActive) {
    return {
      user,
      subscription: null,
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
    };
  }

  if (!level.requiresSubscription) {
    return {
      user,
      subscription: null,
      decision: { allowed: true },
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_levelId: {
        userId: user.id,
        levelId,
      },
    },
    include: {
      payments: {
        where: {
          status: PaymentStatus.SUCCEEDED,
          appliedAt: { not: null },
        },
        orderBy: { appliedAt: "desc" },
        take: 1,
      },
    },
  });

  const decision = evaluatePremiumAccess({
    role: user.role,
    emailVerified: user.emailVerified,
    subscription: subscription
      ? {
          product: subscription.product,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          hasConfirmedPayment: subscription.payments.length > 0,
        }
      : null,
  });

  return { user, subscription, decision };
}

export async function requireActiveSubscription() {
  const result = await getPremiumAccessDecision();

  if (result.decision.allowed && result.subscription) {
    return {
      user: result.user,
      subscription: result.subscription,
    };
  }

  const code = result.decision.allowed
    ? "SUBSCRIPTION_REQUIRED"
    : result.decision.code;

  if (code === "ROLE_NOT_ELIGIBLE") {
    throw new AuthGuardError(
      "FORBIDDEN",
      "Tu rol no puede acceder a este contenido.",
    );
  }

  if (code === "EMAIL_NOT_VERIFIED") {
    throw new AuthGuardError("FORBIDDEN", "Debes verificar tu correo.");
  }

  if (code === "SUBSCRIPTION_REQUIRED") {
    throw new AuthGuardError(
      "SUBSCRIPTION_REQUIRED",
      "Necesitas una suscripcion activa.",
    );
  }

  if (code === "SUBSCRIPTION_EXPIRED") {
    throw new AuthGuardError(
      "SUBSCRIPTION_EXPIRED",
      "Tu suscripcion esta vencida.",
    );
  }

  if (code === "SUBSCRIPTION_NOT_STARTED") {
    throw new AuthGuardError(
      "SUBSCRIPTION_NOT_STARTED",
      "Tu suscripcion todavia no ha iniciado.",
    );
  }

  if (code === "SUBSCRIPTION_PRODUCT_MISMATCH") {
    throw new AuthGuardError(
      "SUBSCRIPTION_PRODUCT_MISMATCH",
      "Tu suscripcion no corresponde a este producto.",
    );
  }

  if (code === "SUBSCRIPTION_PAYMENT_UNCONFIRMED") {
    throw new AuthGuardError(
      "SUBSCRIPTION_PAYMENT_UNCONFIRMED",
      "La suscripcion no tiene un pago confirmado.",
    );
  }

  if (code === "SUBSCRIPTION_INACTIVE") {
    throw new AuthGuardError(
      "SUBSCRIPTION_INACTIVE",
      "Tu suscripcion no esta activa.",
    );
  }

  throw new AuthGuardError(
    "SUBSCRIPTION_INACTIVE",
    "No fue posible validar tu suscripcion.",
  );
}

export { Role, SubscriptionProduct };
