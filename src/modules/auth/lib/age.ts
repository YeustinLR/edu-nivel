export const MINIMUM_SIGN_UP_AGE = 18;
export const MAXIMUM_SIGN_UP_AGE = 100;

export function parseDeclaredAge(value: unknown) {
  const age = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(age)) {
    return null;
  }

  return age;
}

export function isAllowedDeclaredAge(value: number) {
  return value >= MINIMUM_SIGN_UP_AGE && value <= MAXIMUM_SIGN_UP_AGE;
}
