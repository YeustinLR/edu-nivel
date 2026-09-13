import type { AuthFormState } from "@/modules/auth/types/auth-form-state";

type AuthFormMessageProps = {
  state: AuthFormState;
  id?: string;
};

// Mensaje de estado compartido por todos los formularios de auth. El estado "done"
// no se renderiza aqui: los flujos OTP reemplazan el formulario completo al terminar.
export default function AuthFormMessage({
  state,
  id = "auth-form-message",
}: AuthFormMessageProps) {
  if (state.status !== "error" && state.status !== "success") {
    return null;
  }

  return (
    <p
      id={id}
      role={state.status === "error" ? "alert" : "status"}
      aria-live={state.status === "error" ? "assertive" : "polite"}
      className={
        state.status === "error"
          ? "text-small text-danger"
          : "text-small text-success"
      }
    >
      {state.message}
    </p>
  );
}
