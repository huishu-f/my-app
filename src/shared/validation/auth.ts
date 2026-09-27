import { z } from "zod";
import { IMAGE_URL_INVALID_MESSAGE, optionalImageUrlSchema } from "./primitives";

const passwordSchema = z.string().min(6, "密码长度不能少于6位").max(128, "密码长度不能超过128位");

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),

  password: passwordSchema,

  firstName: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "名不能为空").max(50, "名不能超过50个字符"),
  ),

  lastName: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "姓不能为空").max(50, "姓不能超过50个字符"),
  ),

  username: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z
      .string()
      .min(3, "用户名长度不能少于3位")
      .max(30, "用户名长度不能超过30位")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  ),
});

export const loginSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().email("邮箱格式不正确"),
  ),

  password: z.string().min(1, "密码不能为空"),
});

export const changePasswordFieldsSchema = z.object({
  currentPassword: z.string().min(1, "当前密码不能为空"),

  newPassword: passwordSchema,
});

export const changePasswordSchema = changePasswordFieldsSchema.refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "新密码不能与当前密码相同",
    path: ["newPassword"],
    params: { rule: "passwordMismatch" },
  },
);

export const updateProfileSchema = z.object({
  firstName: z.string().max(50, "名不能超过50个字符").optional(),

  lastName: z.string().max(50, "姓不能超过50个字符").optional(),

  avatar: optionalImageUrlSchema("头像URL", 500, IMAGE_URL_INVALID_MESSAGE),

  bio: z.string().max(280, "简介不能超过280个字符").optional(),

  location: z.string().max(100, "所在地不能超过100个字符").optional(),

  website: z
    .string()
    .max(200, "网站URL不能超过200个字符")

    .refine(
      (url) => url === "" || /^https?:\/\//.test(url),
      "网站URL必须以 http:// 或 https:// 开头",
    )
    .optional(),
});

export type LoginField = "email" | "password";

export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export type ProfileField = "firstName" | "lastName" | "avatar" | "bio" | "location" | "website";
