"use client";

import {
  PASSWORD_REQUIREMENTS_HINT,
  PASSWORD_RULES,
  getPasswordScore,
} from "@/modules/auth/lib/password";

type PasswordStrengthMeterProps = {
  password: string;
};

export default function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps) {
  const passwordScore = getPasswordScore(password);
  const passwordStrength = getPasswordStrength(passwordScore);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1">
        {PASSWORD_RULES.map((rule, index) => (
          <div
            key={rule.id}
            className={`h-1.5 rounded-full transition ${
              index < passwordScore ? passwordStrength.barClassName : "bg-border"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-small text-muted">
        <span>{passwordStrength.label}</span>
        <span>{PASSWORD_REQUIREMENTS_HINT}</span>
      </div>
    </div>
  );
}

function getPasswordStrength(score: number) {
  if (score >= 5) {
    return {
      label: "Contrasena fuerte",
      barClassName: "bg-success",
    };
  }

  if (score >= 3) {
    return {
      label: "Contrasena aceptable",
      barClassName: "bg-accent",
    };
  }

  return {
    label: "Contrasena debil",
    barClassName: "bg-red-500",
  };
}
