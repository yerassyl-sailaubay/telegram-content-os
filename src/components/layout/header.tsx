"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type BreadcrumbEntry = {
  label: string;
  href?: string;
};

function useBreadcrumbs(): BreadcrumbEntry[] {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const segmentMap: Record<string, string> = {
    dashboard: t("dashboard"),
    posts: t("posts"),
    channels: t("channels"),
    schedule: t("schedule"),
    analytics: t("analytics"),
    media: t("media"),
    settings: t("settings"),
    billing: t("billing"),
    admin: t("admin"),
    create: t("create"),
    "telegram-post": t("telegramPost"),
  };

  // Strip locale and trailing/leading slash
  const segments = pathname
    .replace(/^\/[a-z]{2}(\/|$)/, "/")
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) {
    return [{ label: t("dashboard") }];
  }

  const crumbs: BreadcrumbEntry[] = [];
  let accPath = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accPath += `/${seg}`;

    const fallbackLabel = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    const label = segmentMap[seg] ?? fallbackLabel;
    const isLast = i === segments.length - 1;

    crumbs.push(isLast ? { label } : { label, href: accPath });
  }

  return crumbs;
}

export function AppHeader() {
  const t = useTranslations("common");
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, idx) => (
            <BreadcrumbItem key={idx}>
              {idx < breadcrumbs.length - 1 ? (
                <>
                  <BreadcrumbLink href={crumb.href ?? "#"}>{crumb.label}</BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative hidden sm:flex">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          placeholder={t("search")}
          className="h-8 w-48 pl-8 text-sm transition-all focus:w-64 lg:w-64 lg:focus:w-80"
        />
      </div>

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
