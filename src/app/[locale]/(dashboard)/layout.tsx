import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin/access";
import { Shell } from "@/components/layout/shell";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser().catch(() => null);

  if (!user) {
    redirect("/login");
  }

  return (
    <Shell userEmail={user.email} isAdmin={isAdminEmail(user.email)}>
      <OnboardingWizard botUsername="tg_content_os_bot" />
      {children}
    </Shell>
  );
}
