export type FormActionIdleState = { status: "idle" };

export type FormActionErrorState<TFieldErrors, TValues> = {
  status: "error";
  message: string;
  fieldErrors?: TFieldErrors;
  values: TValues;
};

export type FormActionSuccessState<TPayload extends object> = {
  status: "success";
  message: string;
} & TPayload;

export type FormActionState<
  TFieldErrors,
  TValues,
  TSuccessPayload extends object,
> =
  | FormActionIdleState
  | FormActionErrorState<TFieldErrors, TValues>
  | FormActionSuccessState<TSuccessPayload>;

export const initialFormActionState: FormActionIdleState = {
  status: "idle",
};
