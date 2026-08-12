"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordToggleLabels = {
  show: string;
  hide: string;
};

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  minLength?: number;
  toggleLabels?: PasswordToggleLabels;
  compact?: boolean;
};

const DEFAULT_TOGGLE_LABELS: PasswordToggleLabels = {
  show: "Mostrar contraseña",
  hide: "Ocultar contraseña",
};

// Campo de contrasena con alternador de visibilidad. Lo comparten login, registro
// y restablecimiento para no replicar el mismo bloque en cada formulario.
export default function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  onChange,
  disabled = false,
  error,
  placeholder,
  minLength,
  toggleLabels = DEFAULT_TOGGLE_LABELS,
  compact = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label htmlFor={id} className="text-small font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border border-border bg-background pr-12 text-body text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-70 ${
            compact ? "px-3 py-2.5" : "px-4 py-3"
          }`}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={showPassword ? toggleLabels.hide : toggleLabels.show}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-small text-red-500">{error}</p>}
    </div>
  );
}
