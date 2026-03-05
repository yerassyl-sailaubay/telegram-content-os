import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/profile-tab";
import { ConnectionsTab } from "@/components/settings/connections-tab";
import { BillingTab } from "@/components/settings/billing-tab";
import { AiPreferencesTab } from "@/components/settings/ai-preferences-tab";
import { getSettings } from "@/server/actions/settings";
import type { PlanTier, SubscriptionStatus } from "@/lib/billing/types";

export default async function SettingsPage() {
  const [t, settingsResult] = await Promise.all([getTranslations("settings"), getSettings()]);
  const settings = settingsResult.success ? settingsResult.data : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <Tabs defaultValue="profile" data-testid="settings-tabs">
        <TabsList className="grid w-full grid-cols-4" data-testid="settings-tabs-list">
          <TabsTrigger value="profile" data-testid="tab-profile">
            {t("tabs.profile")}
          </TabsTrigger>
          <TabsTrigger value="connections" data-testid="tab-connections">
            {t("tabs.connections")}
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            {t("tabs.billing")}
          </TabsTrigger>
          <TabsTrigger value="ai-preferences" data-testid="tab-ai-preferences">
            {t("tabs.aiPreferences")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab
            initialData={{
              name: settings?.profile.name ?? null,
              email: settings?.profile.email ?? "",
              timezone: settings?.profile.timezone ?? "UTC",
              language: settings?.profile.language ?? "en",
            }}
          />
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          <ConnectionsTab
            initialConnections={
              settings?.connections ?? [
                {
                  platform: "linkedin",
                  connected: false,
                  username: null,
                  expiresAt: null,
                  isExpiringSoon: false,
                },
                {
                  platform: "twitter",
                  connected: false,
                  username: null,
                  expiresAt: null,
                  isExpiringSoon: false,
                },
              ]
            }
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingTab
            plan={(settings?.billing.plan ?? "free") as PlanTier}
            status={(settings?.billing.status ?? "active") as SubscriptionStatus}
            stripeCustomerId={settings?.billing.stripeCustomerId ?? null}
            cancelAtPeriodEnd={settings?.billing.cancelAtPeriodEnd ?? false}
            currentPeriodEnd={settings?.billing.currentPeriodEnd ?? null}
          />
        </TabsContent>

        <TabsContent value="ai-preferences" className="mt-6">
          <AiPreferencesTab
            initialData={{
              aiModel: settings?.preferences.aiModel ?? "auto",
              adaptationTone: settings?.preferences.adaptationTone ?? "professional",
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
