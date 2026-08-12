import type { AuthFormState } from "@/modules/auth/types/auth-form-state";

type AuthFormMessageProps = {
  state: AuthFormState;
};

// Mensaje de estado compartido por todos los formularios de auth. El estado "done"
// no se renderiza aqui: los flujos OTP reemplazan el formulario completo al terminar.
export default function AuthFormMessage({ state }: AuthFormMessageProps) {
  if (state.status !== "error" && state.status !== "success") {
    return null;
  }

  return (
    <p
      className={
        state.status === "error"
          ? "text-small text-red-500"
          : "text-small text-success"
      }
    >
      {state.message}
    </p>
  );
}
