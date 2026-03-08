import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; error_description?: string; message?: string }>;
};

export default async function Home({ params, searchParams }: Props) {
  const [{ locale }, searchParamsResolved] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  if (searchParamsResolved.error || searchParamsResolved.error_description) {
    const error = searchParamsResolved.error_description || searchParamsResolved.error;
    redirect(`/${locale}/login?error=${encodeURIComponent(error || "Authentication error")}`);
  }

  return <LandingPage locale={locale} />;
}
