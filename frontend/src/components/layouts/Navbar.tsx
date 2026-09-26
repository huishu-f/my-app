import { Link } from "@/i18n/navigation";
import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";

export function Navbar() {
  const t = useTranslations("nav");
  return (
    <nav className="nav-surface sticky top-0 z-(--z-sticky)">
      <div className="mx-auto flex h-(--nav-h) max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="text-heading group flex shrink-0 items-center gap-2 leading-normal whitespace-nowrap sm:gap-2.5"
        >
          <span className="brand-logo-hover text-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <BookOpen size={20} strokeWidth={2.25} className="h-5 w-5" />
          </span>

          <span className="display-serif text-(length:--type-sm) font-semibold">{t("brand")}</span>
        </Link>

        <NavLinks />

        <div className="ml-auto flex items-center gap-1">
          <div className="flex items-center gap-1 max-md:hidden">
            <ThemeToggle />
            <LanguageToggle />

            <div className="bg-stroke-strong mx-1 h-5 w-px shrink-0" aria-hidden="true" />
            <UserMenu />
          </div>
          <MobileMenu />
        </div>
      </div>

      <div className="nav-bar-separator" aria-hidden="true" />
    </nav>
  );
}
