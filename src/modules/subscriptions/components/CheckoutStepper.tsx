const steps = ["Plan", "Tus datos", "Realiza el SINPE", "Confirmación"] as const;

export function CheckoutStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Progreso de la compra" className="w-full">
      <ol className="grid grid-cols-4">
        {steps.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const complete = step < currentStep;
          const current = step === currentStep;
          return (
            <li key={label} className="relative flex flex-col items-center text-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-3.5 h-0.5 w-full ${
                    complete || current
                      ? "bg-[var(--subscription-accent)]"
                      : "bg-[var(--subscription-border)]"
                  }`}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[0.68rem] font-extrabold ${
                  complete || current
                    ? "border-[var(--subscription-accent)] bg-[var(--subscription-accent)] text-white"
                    : "border-[var(--subscription-border)] bg-[var(--subscription-panel)] text-[var(--subscription-muted)]"
                }`}
              >
                {complete ? "✓" : step}
              </span>
              <span
                aria-current={current ? "step" : undefined}
                className={`mt-1.5 max-w-20 text-[0.68rem] font-bold leading-4 sm:max-w-none sm:text-xs ${
                  current
                    ? "text-[var(--subscription-accent)]"
                    : "text-[var(--subscription-muted)]"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
