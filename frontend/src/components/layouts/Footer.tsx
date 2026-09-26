import { useTranslations } from "next-intl";
import { Container } from "../ui/Container";

export function Footer() {
  const t = useTranslations("footer");

  const tNav = useTranslations("nav");

  return (
    <footer className="bg-page border-stroke border-t py-10">
      <Container className="text-muted flex flex-wrap items-center justify-between gap-4 text-(length:--type-xs) leading-normal max-md:flex-col max-md:gap-3 max-md:text-center">
        <span className="inline-flex items-center font-medium tracking-[0.01em]">
          {t("copyright", { site: tNav("brand"), author: "Hui Shu" })}
        </span>
        <span className="display-serif text-muted text-(length:--type-base) tracking-wide">
          {t("tagline")}
        </span>
      </Container>
    </footer>
  );
}
