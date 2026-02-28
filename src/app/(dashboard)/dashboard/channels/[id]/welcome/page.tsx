import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateEditor } from "@/components/welcome/template-editor";
import { getChannelDetails } from "@/server/actions/channels";
import { getWelcomeTemplate } from "@/server/actions/welcome";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type WelcomePageProps = {
  params: Promise<{ id: string }>;
};

export default async function WelcomePage({ params }: WelcomePageProps) {
  const { id } = await params;
  const t = await getTranslations("welcome");

  // Verify channel exists and user has access
  const channelResult = await getChannelDetails(id);
  if (!channelResult.success) {
    notFound();
  }

  const channel = channelResult.data;

  // Get existing template
  const templateResult = await getWelcomeTemplate(id);
  const template = templateResult.success ? templateResult.data : null;

  return (
    <>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription", {
          channel: channel.title ?? channel.username ?? channel.telegramChatId,
        })}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/channels/${id}`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t("backToChannel")}
            </Link>
          </Button>
        }
      />

      <TemplateEditor channelId={id} initialTemplate={template} />
    </>
  );
}
