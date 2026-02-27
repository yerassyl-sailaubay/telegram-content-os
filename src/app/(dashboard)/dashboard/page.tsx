import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("welcomeMessage")}
      />
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">{tCommon("comingSoon")}</p>
      </div>
    </>
  );
}
