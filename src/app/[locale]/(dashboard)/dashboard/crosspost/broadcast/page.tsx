import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { BroadcastForm } from "@/components/crosspost/broadcast-form";
import { getConnectedPlatforms } from "@/server/actions/crosspost";

export default async function BroadcastPage() {
  const [t, platformsResult] = await Promise.all([
    getTranslations("broadcast"),
    getConnectedPlatforms(),
  ]);
  const connectedPlatforms = platformsResult.success ? platformsResult.data : [];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <BroadcastForm connectedPlatforms={connectedPlatforms} />
    </>
  );
}
