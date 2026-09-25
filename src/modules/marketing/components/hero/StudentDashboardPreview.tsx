import {
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Compass,
  Flame,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Pi,
  Search,
  Sparkles,
} from "lucide-react";

import { EduNivelLogo } from "@/components/layout/EduNivelLogo";

const navigation = [
  { label: "Inicio", icon: LayoutDashboard, active: true },
  { label: "Materias", icon: BookOpen, active: false },
  { label: "Explorar", icon: Compass, active: false },
  { label: "Guardados", icon: Bookmark, active: false },
];

const subjects = [
  {
    name: "Matemáticas",
    modules: "6 módulos",
    icon: Pi,
    cardClass: "border-blue-200/70 bg-[#eef5ff] dark:border-blue-400/15 dark:bg-blue-500/10",
    iconClass: "bg-blue-600",
  },
  {
    name: "Español",
    modules: "5 módulos",
    icon: BookOpen,
    cardClass: "border-violet-200/70 bg-[#f6f0ff] dark:border-violet-400/15 dark:bg-violet-500/10",
    iconClass: "bg-violet-600",
  },
  {
    name: "Ciencias",
    modules: "4 módulos",
    icon: FlaskConical,
    cardClass: "border-emerald-200/70 bg-[#f0f9ed] dark:border-emerald-400/15 dark:bg-emerald-500/10",
    iconClass: "bg-emerald-600",
  },
];

export default function StudentDashboardPreview() {
  return (
    <figure
      aria-labelledby="student-dashboard-preview-caption"
      className="learner-dashboard fadein relative"
      style={{ animationDelay: ".15s" }}
    >
      <div
        aria-hidden="true"
        className="absolute -inset-5 -z-10 rounded-[3rem] bg-gradient-to-br from-violet/15 via-transparent to-emerald-400/15 blur-2xl"
      />

      <div className="pointer-events-none grid min-h-[410px] select-none overflow-hidden rounded-[1.75rem] border border-[var(--student-border)] bg-[var(--student-bg)] shadow-[0_30px_80px_rgba(19,27,46,0.18)] sm:grid-cols-[132px_minmax(0,1fr)]">
        <aside className="hidden flex-col bg-ink-900 px-3 py-5 text-white sm:flex">
          <div className="origin-left scale-[0.72]">
            <EduNivelLogo inverse size="large" />
          </div>

          <nav aria-label="Vista previa de la navegación" className="mt-7">
            <ul className="space-y-1.5">
              {navigation.map(({ label, icon: Icon, active }) => (
                <li
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold ${
                    active ? "bg-[#21345f] text-white" : "text-white/65"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`size-3.5 ${active ? "text-[#56c8ff]" : "text-white/45"}`}
                    strokeWidth={2}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto rounded-xl border border-orange-300/15 bg-orange-300/10 px-2.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-bold text-orange-200">
              <Flame aria-hidden="true" className="size-3.5 fill-orange-400 text-orange-400" />
              Racha de aprendizaje
            </p>
            <p className="mt-1 text-[10px] font-semibold text-white">5 días seguidos</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="flex h-[62px] items-center gap-2 border-b border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-bg)_92%,transparent)] px-3.5 sm:px-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-gold-100 to-white text-gold shadow-sm ring-1 ring-gold/15 dark:from-gold/20 dark:to-[var(--student-panel)]">
              <Sparkles aria-hidden="true" className="size-3.5" fill="currentColor" />
            </span>
            <p className="min-w-0 truncate text-xs font-semibold text-[var(--student-muted)]">
              Hola, <strong className="font-bold text-[var(--student-text)]">Sofía</strong>
              <span aria-hidden="true" className="ml-1">👋</span>
            </p>

            <div className="ml-auto hidden h-8 min-w-0 max-w-40 flex-1 items-center gap-2 rounded-lg border border-[var(--student-border)] bg-[var(--student-panel)] px-2.5 text-[9px] text-[var(--student-muted)] md:flex">
              <Search aria-hidden="true" className="size-3" />
              Buscar contenido...
            </div>
            <span className="ml-auto flex size-8 items-center justify-center rounded-full text-[var(--student-text)] md:ml-0">
              <Bell aria-hidden="true" className="size-3.5" />
            </span>
          </header>

          <div className="flex-1 p-3 sm:p-4">
            <div className="grid gap-2.5 sm:grid-cols-[0.8fr_1.2fr]">
              <section className="flex min-h-[126px] items-center rounded-2xl border border-[var(--student-border)] bg-[linear-gradient(135deg,var(--student-panel),color-mix(in_srgb,var(--student-panel)_78%,#eaf8e8))] p-3 shadow-sm">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e4f6df] text-[#24783c] dark:bg-emerald-500/15 dark:text-emerald-300">
                  <GraduationCap aria-hidden="true" className="size-5.5" strokeWidth={1.8} />
                </span>
                <div className="ml-3 min-w-0">
                  <p className="text-[9px] font-medium text-[var(--student-muted)]">Tu nivel actual</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-extrabold text-[var(--student-text)]">
                    Octavo año
                    <ChevronDown aria-hidden="true" className="size-3 text-[var(--student-muted)]" />
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#e7f7e5] px-2 py-1 text-[8px] font-bold text-[#24733a] dark:bg-emerald-500/15 dark:text-emerald-300">
                    <CheckCircle2 aria-hidden="true" className="size-3" />
                    Suscripción activa
                  </span>
                </div>
              </section>

              <section className="relative min-h-[126px] overflow-hidden rounded-2xl border border-blue-200/75 bg-[linear-gradient(105deg,#f6f9ff_0%,#eaf2ff_100%)] p-3.5 shadow-sm dark:border-blue-400/15 dark:bg-[linear-gradient(105deg,#0d1b2e_0%,#102b55_100%)]">
                <div className="relative z-10 max-w-[72%]">
                  <p className="text-[9px] font-bold text-[var(--student-blue)]">Continúa aprendiendo</p>
                  <h2 className="mt-1 text-sm font-extrabold leading-tight text-[var(--student-text)]">Matemáticas</h2>
                  <p className="mt-1 truncate text-[9px] text-[var(--student-muted)]">Álgebra · Ecuaciones lineales</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-200/70 dark:bg-blue-950/70">
                      <div className="h-full w-[68%] rounded-full bg-[var(--student-blue)]" />
                    </div>
                    <span className="text-[8px] font-semibold text-[var(--student-muted)]">68%</span>
                  </div>
                </div>
                <span className="absolute bottom-3 right-3 z-10 flex size-8 items-center justify-center rounded-lg bg-[var(--student-blue)] text-white shadow-md">
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </span>
              </section>
            </div>

            <div className="mb-2 mt-4 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-[var(--student-text)]">Mis materias</h2>
              <span className="text-[9px] font-bold text-[var(--student-blue)]">Ver todas</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {subjects.map(({ name, modules, icon: Icon, cardClass, iconClass }, index) => (
                <article
                  key={name}
                  className={`${index === 2 ? "hidden sm:block" : ""} relative min-h-[100px] overflow-hidden rounded-2xl border p-3 ${cardClass}`}
                >
                  <span className={`flex size-8 items-center justify-center rounded-full text-white shadow-sm ${iconClass}`}>
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-2 truncate text-[10px] font-bold text-[var(--student-text)]">{name}</h3>
                  <p className="mt-0.5 text-[8px] text-[var(--student-muted)]">{modules}</p>
                </article>
              ))}
            </div>
          </div>

          <nav aria-label="Vista previa de la navegación móvil" className="grid h-12 grid-cols-4 border-t border-[var(--student-border)] bg-[var(--student-panel)] sm:hidden">
            {[
              { label: "Inicio", icon: LayoutDashboard },
              { label: "Materias", icon: BookOpen },
              { label: "Explorar", icon: Compass },
              { label: "Más", icon: Menu },
            ].map(({ label, icon: Icon }, index) => (
              <span key={label} className={`flex flex-col items-center justify-center gap-0.5 text-[7px] font-semibold ${index === 0 ? "text-[var(--student-blue)]" : "text-[var(--student-muted)]"}`}>
                <Icon aria-hidden="true" className="size-3.5" />
                {label}
              </span>
            ))}
          </nav>
        </div>
      </div>

      <figcaption
        id="student-dashboard-preview-caption"
        className="mt-3 text-center text-xs font-medium text-muted"
      >
        Vista del panel del estudiante en EduNivel
      </figcaption>
    </figure>
  );
}
