import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const RUN_SANDBOX_E2E = process.env.RUN_ONVO_SANDBOX_E2E === "1";
const appUrl = "http://localhost:3000";

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

function hiddenInput(html: string, name: string): string {
  const match = html.match(
    new RegExp(`name="${name.replace("$", "\\$")}" value="([^"]+)"`),
  );

  if (!match?.[1]) {
    throw new Error(`No se encontro el campo ${name}.`);
  }

  return match[1];
}

function serverActionName(html: string): string {
  const match = html.match(/name="(\$ACTION_ID_[^"]+)"/);

  if (!match?.[1]) {
    throw new Error("No se encontro la Server Action del formulario SINPE.");
  }

  return match[1];
}

describe.skipIf(!RUN_SANDBOX_E2E)("ONVO Sandbox renewal", () => {
  it(
    "validates renewal, ownership and role-specific access with real payments",
    async () => {
      const { config } = await import("dotenv");
      config({ path: [".env.local", ".env"], quiet: true });

      const [{ prisma }, { addUtcCalendarMonths }, { env }] = await Promise.all([
        import("@/server/db/prisma"),
        import("@/modules/subscriptions/domain/subscription-period"),
        import("@/config/env"),
      ]);
      const unique = randomUUID();
      const email = `onvo-renewal-${unique}@example.com`;
      const password = `Onvo!Renewal9-${unique}`;

      const signUpResponse = await fetch(`${appUrl}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: appUrl,
        },
        body: JSON.stringify({
          name: "ONVO Renewal E2E",
          email,
          password,
          ageDeclared: 25,
        }),
      });
      expect(signUpResponse.status).toBe(200);

      const user = await prisma.user.update({
        where: { email },
        data: { emailVerified: true },
      });
      const signInResponse = await fetch(`${appUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: appUrl,
        },
        body: JSON.stringify({ email, password }),
      });
      expect(signInResponse.status).toBe(200);
      const cookie = cookieHeader(signInResponse);
      expect(cookie).not.toBe("");

      async function startPayment(
        planCode: string,
        sessionCookie = cookie,
      ): Promise<string> {
        const pageResponse = await fetch(`${appUrl}/dashboard/subscription`, {
          headers: { cookie: sessionCookie },
        });
        expect(pageResponse.status).toBe(200);
        const html = await pageResponse.text();
        const checkoutRequestId = hiddenInput(html, "checkoutRequestId");
        const actionName = serverActionName(html);
        const form = new FormData();

        form.set(actionName, "");
        form.set("checkoutRequestId", checkoutRequestId);
        form.set("planCode", planCode);
        form.set("mobileNumber", "+50688888888");
        form.set("identificationType", "0");
        form.set("identification", "01-1234-5678");

        const response = await fetch(`${appUrl}/dashboard/subscription`, {
          method: "POST",
          headers: {
            cookie: sessionCookie,
            origin: appUrl,
          },
          body: form,
          redirect: "manual",
        });
        expect(response.status).toBe(303);
        const location = response.headers.get("location") ?? "";
        const paymentId = location.match(
          /\/dashboard\/subscription\/payments\/([^/?]+)/,
        )?.[1];

        if (!paymentId) {
          throw new Error(`Redireccion de pago inesperada: ${location}`);
        }

        return paymentId;
      }

      async function waitForApplication(paymentId: string) {
        const deadline = Date.now() + 50_000;

        while (Date.now() < deadline) {
          const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { subscription: true },
          });

          if (
            payment?.status === "SUCCEEDED" &&
            payment.appliedAt &&
            payment.subscription
          ) {
            return payment;
          }

          await wait(2_000);
        }

        throw new Error(`ONVO no aplico el pago ${paymentId} a tiempo.`);
      }

      const blockedResponse = await fetch(
        `${appUrl}/dashboard/premium-test`,
        { headers: { cookie } },
      );
      expect(await blockedResponse.text()).toContain("Contenido bloqueado");

      const monthlyPaymentId = await startPayment("STUDENT_MONTHLY");
      const monthlyPayment = await waitForApplication(monthlyPaymentId);
      const firstPeriodEnd = monthlyPayment.subscription!.currentPeriodEnd;

      expect(monthlyPayment.subscription!.userId).toBe(user.id);
      expect(monthlyPayment.subscription!.lastPlanCode).toBe(
        "STUDENT_MONTHLY",
      );

      const yearlyPaymentId = await startPayment("STUDENT_YEARLY");
      const yearlyPayment = await waitForApplication(yearlyPaymentId);
      const finalPeriodEnd = yearlyPayment.subscription!.currentPeriodEnd;

      expect(yearlyPayment.subscriptionId).toBe(
        monthlyPayment.subscriptionId,
      );
      expect(yearlyPayment.subscription!.lastPlanCode).toBe("STUDENT_YEARLY");
      expect(finalPeriodEnd).toEqual(
        addUtcCalendarMonths(firstPeriodEnd, 12),
      );

      const appliedAt = yearlyPayment.appliedAt;
      const duplicateResponse = await fetch(
        `${appUrl}/api/webhooks/onvo`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-webhook-secret": env.ONVO_WEBHOOK_SECRET!,
          },
          body: JSON.stringify({
            type: "payment-intent.succeeded",
            data: { id: yearlyPayment.providerPaymentIntentId },
          }),
        },
      );
      expect(duplicateResponse.status).toBe(200);

      const afterDuplicate = await prisma.payment.findUniqueOrThrow({
        where: { id: yearlyPaymentId },
        include: { subscription: true },
      });
      expect(afterDuplicate.appliedAt).toEqual(appliedAt);
      expect(afterDuplicate.subscription!.currentPeriodEnd).toEqual(
        finalPeriodEnd,
      );

      const premiumResponse = await fetch(
        `${appUrl}/dashboard/premium-test`,
        { headers: { cookie } },
      );
      expect(await premiumResponse.text()).toContain("Acceso autorizado");

      const teacherEmail = `onvo-teacher-${unique}@example.com`;
      const teacherSignUp = await fetch(`${appUrl}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: appUrl,
        },
        body: JSON.stringify({
          name: "ONVO Teacher E2E",
          email: teacherEmail,
          password,
          ageDeclared: 30,
        }),
      });
      expect(teacherSignUp.status).toBe(200);
      const teacher = await prisma.user.update({
        where: { email: teacherEmail },
        data: {
          emailVerified: true,
          role: "TEACHER",
        },
      });
      const teacherSignIn = await fetch(`${appUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: appUrl,
        },
        body: JSON.stringify({
          email: teacherEmail,
          password,
        }),
      });
      expect(teacherSignIn.status).toBe(200);
      const teacherCookie = cookieHeader(teacherSignIn);

      const teacherBlocked = await fetch(
        `${appUrl}/dashboard/premium-test`,
        { headers: { cookie: teacherCookie } },
      );
      expect(await teacherBlocked.text()).toContain("Contenido bloqueado");

      const foreignPayment = await fetch(
        `${appUrl}/dashboard/subscription/payments/${monthlyPaymentId}`,
        { headers: { cookie: teacherCookie } },
      );
      expect(foreignPayment.status).toBe(404);

      const teacherPaymentId = await startPayment(
        "TEACHER_MONTHLY",
        teacherCookie,
      );
      const teacherPayment = await waitForApplication(teacherPaymentId);

      expect(teacherPayment.userId).toBe(teacher.id);
      expect(teacherPayment.roleAtCheckout).toBe("TEACHER");
      expect(teacherPayment.product).toBe("TEACHER_PREMIUM");
      expect(teacherPayment.subscription!.product).toBe("TEACHER_PREMIUM");

      const teacherPremium = await fetch(
        `${appUrl}/dashboard/premium-test`,
        { headers: { cookie: teacherCookie } },
      );
      expect(await teacherPremium.text()).toContain("Acceso autorizado");
    },
    180_000,
  );
});
