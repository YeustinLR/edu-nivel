import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  UsersRound,
} from "lucide-react";

import { env } from "@/config/env";

const CONTACT_EMAIL = "ericv@gmail.com";
const WHATSAPP_MESSAGE = "Hola EduNivel, necesito ayuda con:";
const WHATSAPP_URL = `https://wa.me/${env.CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const contactDetails = [
  {
    id: "email",
    icon: Mail,
    label: "Correo",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    id: "location",
    icon: MapPin,
    label: "Ubicación",
    value: "San José, Costa Rica",
  },
  {
    id: "schedule",
    icon: Clock3,
    label: "Horario",
    value: "Lun–Vie · 8:00 a. m.–5:00 p. m.",
  },
];

const supportTopics = [
  {
    id: "access",
    icon: KeyRound,
    title: "Cuenta y acceso",
    description: "Ingreso, contraseña, verificación de correo o configuración.",
    subject: "Ayuda con mi cuenta",
    color: "secondary",
  },
  {
    id: "plans",
    icon: CreditCard,
    title: "Planes y pagos",
    description: "Suscripciones, cobros, comprobantes o cambios de plan.",
    subject: "Consulta sobre planes y pagos",
    color: "accent",
  },
  {
    id: "content",
    icon: BookOpen,
    title: "Contenido educativo",
    description: "Materias, niveles, recursos y consultas sobre la plataforma.",
    subject: "Consulta sobre contenido educativo",
    color: "success",
  },
] as const;

const socialLinks = [
  {
    id: "facebook",
    label: "Facebook",
    handle: "EduNivelCR",
    href: "https://facebook.com/EduNivelCR",
    icon: UsersRound,
  },
  {
    id: "instagram",
    label: "Instagram",
    handle: "@edunivelcr",
    href: "https://instagram.com/edunivelcr",
    icon: Camera,
  },
];

const topicStyles = {
  secondary: {
    icon: "bg-secondary/10 text-secondary",
    hover: "hover:border-secondary/30",
  },
  accent: {
    icon: "bg-accent/15 text-accent",
    hover: "hover:border-accent/35",
  },
  success: {
    icon: "bg-success/10 text-success",
    hover: "hover:border-success/30",
  },
};

export default function ContactSection() {
  return (
    <section className="relative isolate overflow-hidden bg-background px-5 pb-20 pt-28 md:pb-28 md:pt-32 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_5%,color-mix(in_srgb,var(--secondary)_13%,transparent),transparent_38%),radial-gradient(circle_at_88%_12%,color-mix(in_srgb,var(--accent)_9%,transparent),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-success/5 blur-3xl"
      />

      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-16">
          <div className="fadein pt-1 lg:pt-6">
            <div className="badge-purple mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold">
              <MessagesSquare size={14} aria-hidden="true" />
              Contacto y soporte
            </div>

            <h1 className="hero-title max-w-xl">
              Estamos cerca cuando{" "}
              <span className="grad-text">necesitás ayuda.</span>
            </h1>
            <p className="hero-description mt-5 max-w-xl">
              Contanos qué necesitás y nuestro equipo te orientará con tu
              cuenta, tu plan o cualquier consulta sobre EduNivel.
            </p>

            <div className="mt-8 flex w-fit items-center gap-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Equipo disponible
                </p>
                <p className="text-xs text-muted">
                  Normalmente respondemos en menos de 24 horas.
                </p>
              </div>
            </div>

            <dl className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {contactDetails.map(({ id, icon: Icon, label, value, href }) => (
                <div key={id} className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted shadow-sm">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-muted">{label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
                      {href ? (
                        <Link
                          href={href}
                          className="transition-colors hover:text-secondary"
                        >
                          {value}
                        </Link>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative fadein [animation-delay:100ms]">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              <div className="border-b border-border bg-surface/70 px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20">
                    <MessageCircle size={21} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      Hablemos de tu consulta
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Elegí el canal que te resulte más cómodo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 sm:p-8">
                <Link
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-5 rounded-2xl border border-success/25 bg-success/8 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-success/45 hover:bg-success/12 hover:shadow-lg hover:shadow-success/5"
                  aria-label="Conversar con EduNivel por WhatsApp, abre en una pestaña nueva"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success text-white shadow-md shadow-success/20">
                      <MessageCircle size={22} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-bold text-foreground">
                        Escribinos por WhatsApp
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        La opción más rápida para consultas breves
                      </span>
                    </span>
                  </span>
                  <ArrowUpRight
                    size={19}
                    className="shrink-0 text-success transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  href={`mailto:${CONTACT_EMAIL}?subject=Consulta%20desde%20EduNivel`}
                  className="group flex items-center justify-between gap-5 rounded-2xl border border-border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/5"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                      <Mail size={21} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-bold text-foreground">
                        Enviarnos un correo
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        Ideal si necesitás compartir más detalles
                      </span>
                    </span>
                  </span>
                  <ArrowUpRight
                    size={19}
                    className="shrink-0 text-secondary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <div className="flex gap-3 rounded-2xl bg-surface px-4 py-3.5">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-5 text-muted">
                    Para ayudarte más rápido, incluí el correo de tu cuenta y
                    una breve descripción del inconveniente. Nunca compartás tu
                    contraseña.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-border pt-12 md:mt-24 md:pt-16">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                Te orientamos
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                ¿Sobre qué necesitás ayuda?
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted sm:text-right">
              Seleccioná un tema y abriremos un correo con el asunto listo.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {supportTopics.map(
              ({ id, icon: Icon, title, description, subject, color }) => {
                const styles = topicStyles[color];

                return (
                  <Link
                    key={id}
                    href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
                    className={`group rounded-3xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5 ${styles.hover}`}
                  >
                    <div
                      className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${styles.icon}`}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-foreground">{title}</h3>
                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {description}
                    </p>
                  </Link>
                );
              },
            )}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl border border-border bg-surface/70 px-6 py-5 sm:flex-row">
            <div>
              <p className="text-sm font-semibold text-foreground">
                También estamos en redes
              </p>
              <p className="mt-1 text-xs text-muted">
                Novedades, recursos y consejos para aprender mejor.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {socialLinks.map(
                ({ id, label, handle, href, icon: Icon }) => (
                  <Link
                    key={id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-secondary/30 hover:text-secondary"
                    aria-label={`${label} de EduNivel, abre en una pestaña nueva`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span className="font-semibold">{handle}</span>
                    <ArrowUpRight
                      size={13}
                      className="text-muted group-hover:text-secondary"
                      aria-hidden="true"
                    />
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
