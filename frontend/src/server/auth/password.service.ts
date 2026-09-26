import "server-only";
import bcrypt from "bcryptjs";
import { env } from "@server/common/config/env";
import type { PasswordService } from "@my-app/shared";

export type { PasswordService };

export const passwordService: PasswordService = {
  hash: (password) => bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
  compare: (password, hash) => bcrypt.compare(password, hash),
};
