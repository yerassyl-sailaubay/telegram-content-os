"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Link2, CalendarDays } from "lucide-react";

export function QuickActions() {
  const t = useTranslations("dashboard");

  return (
    <div data-testid="quick-actions" className="flex flex-wrap items-center gap-3">
      <Button asChild>
        <Link href="/dashboard/telegram-post">
          <Plus className="mr-2 h-4 w-4" />
          {t("actionNewPost")}
        </Link>
      </Button>
      <Button variant="secondary" asChild>
        <Link href="/dashboard/create">
          <Link2 className="mr-2 h-4 w-4" />
          {t("actionCreateFromUrl")}
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/dashboard/schedule">
          <CalendarDays className="mr-2 h-4 w-4" />
          {t("actionViewSchedule")}
        </Link>
      </Button>
    </div>
  );
}
