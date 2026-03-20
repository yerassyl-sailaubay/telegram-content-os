"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONE_GROUPS, getUtcOffset } from "@/lib/scheduling/timezone";
import { Globe } from "lucide-react";

type TimezoneSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function TimezoneSelect({ value, onValueChange, className }: TimezoneSelectProps) {
  const t = useTranslations("schedule");
  const now = new Date();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
          <SelectValue placeholder={t("timezone")} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {TIMEZONE_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {group.label}
            </SelectLabel>
            {group.timezones.map((tz) => {
              const offset = getUtcOffset(tz.value, now);
              return (
                <SelectItem key={tz.value} value={tz.value}>
                  <span className="flex items-center justify-between gap-3">
                    <span>{tz.label}</span>
                    <span className="text-muted-foreground font-mono text-xs">UTC{offset}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
