import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { AdminConsole } from "@/components/admin/admin-console";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminConsoleData } from "@/server/actions/admin";

export default async function AdminPage() {
  const [t, result] = await Promise.all([getTranslations("admin"), getAdminConsoleData()]);

  if (!result.success) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <Card data-testid="admin-access-error">
          <CardHeader>
            <CardTitle>{t("accessErrorTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{result.error}</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <AdminConsole initialData={result.data} />
    </>
  );
}
