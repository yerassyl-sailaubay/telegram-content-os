import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";

export default async function ChannelsPage() {
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <>
      <PageHeader title={t("channels")} />
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">{tCommon("comingSoon")}</p>
      </div>
    </>
  );
}
