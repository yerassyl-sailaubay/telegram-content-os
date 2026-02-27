import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between px-16 py-32 sm:items-start">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {t("title")}
          </h1>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {t("welcomeMessage")}
          </p>
          <p className="text-sm text-muted-foreground">{t("quickActions")}</p>
        </div>
      </main>
    </div>
  );
}
