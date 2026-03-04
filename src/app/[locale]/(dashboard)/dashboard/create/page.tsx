import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { UrlInputForm } from "@/components/create/url-input-form";

export default async function CreateFromUrlPage() {
  const t = await getTranslations("createFromUrl");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <UrlInputForm />
    </>
  );
}
