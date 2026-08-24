import { GraduationCap } from "lucide-react";

export function EduNivelLogo({
  inverse = false,
  size = "default",
}: {
  inverse?: boolean;
  size?: "default" | "large";
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex shrink-0 items-center justify-center bg-accent text-accent-foreground ${
          size === "large" ? "h-10 w-10 rounded-xl" : "h-8 w-8 rounded-lg"
        }`}
      >
        <GraduationCap
          aria-hidden="true"
          className={size === "large" ? "h-5 w-5" : "h-[17px] w-[17px]"}
          strokeWidth={2.5}
        />
      </span>
      <span
        className={`${
          size === "large" ? "text-[1.35rem]" : "text-lg"
        } font-extrabold tracking-[-0.02em] ${inverse ? "text-white" : "text-foreground"}`}
      >
        Edu<span className="text-accent">Nivel</span>
      </span>
    </span>
  );
}
