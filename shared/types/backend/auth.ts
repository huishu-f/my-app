import type { AuthPayload } from "../user";

export type TokenVerifyResult =
  { success: true; payload: AuthPayload } | { success: false; errorType: "expired" | "invalid" };

export interface TokenService {
  generate(payload: AuthPayload): string;

  verify(token: string): TokenVerifyResult;

  decode(token: string): AuthPayload | null;
}

export interface PasswordService {
  hash(password: string): Promise<string>;

  compare(password: string, hash: string): Promise<boolean>;
}
