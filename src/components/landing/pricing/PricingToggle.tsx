interface Props {
  planAnual: boolean;
  setPlanAnual: (v: boolean) => void;
}

export default function PricingToggle({ planAnual, setPlanAnual }: Props) {
  return (
    <div className="flex justify-center mb-10">
      <div className="glass-card rounded-2xl p-1 inline-flex gap-1">
        <button
          onClick={() => setPlanAnual(false)}
          className={`px-5 py-2 rounded-xl text-small font-semibold transition-all cursor-pointer border-0 ${
            !planAnual ? "bg-accent text-accent-foreground" : "text-muted bg-transparent"
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setPlanAnual(true)}
          className={`px-5 py-2 rounded-xl text-small font-semibold transition-all cursor-pointer flex items-center gap-2 border-0 ${
            planAnual ? "bg-accent text-accent-foreground" : "text-muted bg-transparent"
          }`}
        >
          Anual
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
              planAnual ? "bg-accent-foreground text-accent" : "bg-success/20 text-success"
            }`}
          >
            -20%
          </span>
        </button>
      </div>
    </div>
  );
}
