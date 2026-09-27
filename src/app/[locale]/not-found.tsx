import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <Container className="page-section">
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-3xl) leading-tight font-bold">
          404
        </h1>
        <p className="text-muted mb-10 max-w-90 text-(length:--type-base) leading-relaxed">
          {t("notFoundDesc")}
        </p>

        <div className="flex items-center gap-3">
          <Button href="/">{t("goHome")}</Button>
          <Button variant="outline" href="/posts">
            {t("browsePosts")}
          </Button>
        </div>
      </div>
    </Container>
  );
}
