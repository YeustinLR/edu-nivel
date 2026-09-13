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
  invalid?: boolean;
  describedBy?: string;
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
  invalid = false,
  describedBy,
  placeholder,
  minLength,
  toggleLabels = DEFAULT_TOGGLE_LABELS,
  compact = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${id}-error`;

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
          aria-invalid={Boolean(error) || invalid}
          aria-describedby={error ? errorId : describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border border-border bg-background pr-12 text-body text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 ${
            compact ? "px-3 py-2.5" : "px-4 py-3"
          }`}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={showPassword ? toggleLabels.hide : toggleLabels.show}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p id={errorId} className="text-small text-danger">{error}</p>}
    </div>
  );
}
