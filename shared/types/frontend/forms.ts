export type FieldId = "firstName" | "lastName" | "username" | "email" | "password";

export interface FieldState {
  value: string;

  touched: boolean;

  valid: boolean | null;

  error: string | null;
}
