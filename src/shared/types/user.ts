export interface User {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  username: string;

  avatar: string;

  coverImage: string;

  bio: string;

  location: string;

  website: string;

  joined: string;

  role: string;

  company: string;

  verified: boolean;

  disabled?: boolean;

  tags: string[];

  social: UserSocial;

  stats: UserStats;

  password?: string;

  tokenVersion?: number;

  appearance?: {
    theme: "light" | "dark" | "system";

    fontSize: "small" | "medium" | "large";
  };

  likedArticles?: string[];

  favoritedArticles?: string[];

  createdAt: string;

  updatedAt: string;
}

interface UserSocial {
  twitter: string;

  github: string;

  linkedin: string;
}

export interface UserStats {
  articles: number;

  likes: number;

  views: number;
}

export interface RegisterDto {
  email: string;

  password: string;

  firstName: string;

  lastName: string;

  username: string;
}

export interface LoginDto {
  email: string;

  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;

  newPassword: string;
}

export interface UpdateProfileDto {
  firstName?: string;

  lastName?: string;

  avatar?: string;

  bio?: string;

  location?: string;

  website?: string;
}

export interface AuthPayload {
  id: string;

  email: string;

  tokenVersion: number;

  iat?: number;

  exp?: number;
}

export type SafeUser = Omit<User, "password" | "tokenVersion" | "disabled">;
