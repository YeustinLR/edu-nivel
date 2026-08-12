"use client";

import { useFormStatus } from "react-dom";

export function CollaboratorSubmitButton({
  label,
  pendingLabel,
  className,
  name,
  value,
}: {
  label: string;
  pendingLabel: string;
  className: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
