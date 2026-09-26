import { routing } from "./routing";
import zh from "./messages/zh";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];

    Messages: typeof zh;
  }
}
