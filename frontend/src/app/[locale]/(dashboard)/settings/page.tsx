import { Container } from "@/components/ui/Container";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layouts/PageHeader";
import { routing } from "@/i18n/routing";
import { requireUserOrRedirect } from "@server/auth/auth.service";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  await requireUserOrRedirect(locale, `/${locale}/settings`);

  const t = await getTranslations("settings");
  return (
    <Container className="page-section">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SettingsForm />
    </Container>
  );
}
