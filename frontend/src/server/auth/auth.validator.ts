import "server-only";
import { createParser } from "@server/common/zod";
import { ValidationError } from "@server/common/errors";
import {
  changePasswordSchema,
  formatZodIssues,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "@my-app/shared";

const _parseRegister = createParser(registerSchema, "Registration validation failed");

export function parseRegisterBody(body: unknown): {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
} {
  const data = _parseRegister(body);

  return { ...data, email: data.email.toLowerCase() };
}

const _parseLogin = createParser(loginSchema, "Login validation failed");

export function parseLoginBody(body: unknown): { email: string; password: string } {
  const data = _parseLogin(body);

  return { ...data, email: data.email.toLowerCase() };
}

export const parseChangePasswordBody = createParser(
  changePasswordSchema,
  "Change password validation failed",
);

export function parseUpdateProfileBody(body: unknown): Record<string, string | undefined> {
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Profile validation failed", formatZodIssues(result.error.issues));
  }

  const data: Record<string, string | undefined> = {};
  const { firstName, lastName, avatar, bio, location, website } = result.data;
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (avatar !== undefined) data.avatar = avatar;
  if (bio !== undefined) data.bio = bio.trim();
  if (location !== undefined) data.location = location.trim();
  if (website !== undefined) data.website = website.trim();
  return data;
}
