"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlanTier, SubscriptionStatus } from "@/lib/billing/types";
import { updateAdminBillingRecord } from "@/server/actions/admin";
import type { AdminBillingUser, AdminConsoleData } from "@/server/actions/admin";

type BillingDraftRow = AdminBillingUser & {
  currentPeriodEndInput: string;
};

const PLAN_OPTIONS: PlanTier[] = ["free", "plus", "pro"];
const STATUS_OPTIONS: SubscriptionStatus[] = ["active", "trialing", "past_due", "canceled"];

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "failed" || status === "past_due" || status === "canceled") {
    return <Badge variant="destructive">{status}</Badge>;
  }

  if (status === "pending" || status === "processing" || status === "trialing") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}

export function AdminConsole({ initialData }: { initialData: AdminConsoleData }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<BillingDraftRow[]>(
    initialData.billingUsers.map((row) => ({
      ...row,
      currentPeriodEndInput: toDateInputValue(row.currentPeriodEnd),
    })),
  );
  const [messages, setMessages] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  const missingEnvCount = initialData.envChecks.filter((item) => !item.configured).length;

  function updateRow(userId: string, patch: Partial<BillingDraftRow>) {
    setRows((prev) => prev.map((row) => (row.userId === userId ? { ...row, ...patch } : row)));
  }

  function handleSave(row: BillingDraftRow) {
    setSavingUserId(row.userId);
    setMessages((prev) => {
      const next = { ...prev };
      delete next[row.userId];
      return next;
    });

    startTransition(async () => {
      const result = await updateAdminBillingRecord({
        userId: row.userId,
        plan: row.plan,
        status: row.status,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        currentPeriodEnd: row.currentPeriodEndInput || null,
        usageMonth: row.usageMonth,
        crossPostsUsed: row.crossPostsUsed,
        aiCallsUsed: row.aiCallsUsed,
      });

      if (result.success) {
        setMessages((prev) => ({
          ...prev,
          [row.userId]: { type: "success", text: t("billing.saveSuccess") },
        }));
        router.refresh();
      } else {
        setMessages((prev) => ({
          ...prev,
          [row.userId]: { type: "error", text: result.error },
        }));
      }

      setSavingUserId(null);
    });
  }

  return (
    <div className="space-y-6" data-testid="admin-console">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-sm">
          {t("snapshotAt", { date: new Date(initialData.generatedAt).toLocaleString() })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          disabled={isPending}
          data-testid="admin-refresh-button"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("refresh")}
        </Button>
      </div>

      {initialData.access.mode === "open_dev" && (
        <Card className="border-amber-500/60 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t("openModeTitle")}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {t("openModeDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" data-testid="admin-tabs">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="billing">{t("tabs.billing")}</TabsTrigger>
          <TabsTrigger value="logs">{t("tabs.logs")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.totalUsers")}</CardDescription>
                <CardTitle>{initialData.overview.totalUsers}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.paidUsers")}</CardDescription>
                <CardTitle>{initialData.overview.paidUsers}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.pastDueUsers")}</CardDescription>
                <CardTitle>{initialData.overview.pastDueUsers}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.crossPosts24h")}</CardDescription>
                <CardTitle>{initialData.overview.crossPostsLast24h}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.failedCrossPosts24h")}</CardDescription>
                <CardTitle>{initialData.overview.failedCrossPostsLast24h}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.pendingSchedules")}</CardDescription>
                <CardTitle>{initialData.overview.pendingSchedules}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.failedSchedules24h")}</CardDescription>
                <CardTitle>{initialData.overview.failedSchedulesLast24h}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.crossPostsMonth")}</CardDescription>
                <CardTitle>{initialData.overview.totalCrossPostsThisMonth}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.aiCallsMonth")}</CardDescription>
                <CardTitle>{initialData.overview.totalAiCallsThisMonth}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.aiCostMonth")}</CardDescription>
                <CardTitle>{formatUsd(initialData.aiInsights.totalCostUsdThisMonth)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.aiCost24h")}</CardDescription>
                <CardTitle>{formatUsd(initialData.aiInsights.totalCostUsdLast24h)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("metrics.promptCacheHitRate")}</CardDescription>
                <CardTitle>
                  {initialData.aiInsights.promptCacheHitRatePercent.toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card data-testid="admin-env-checks">
            <CardHeader>
              <CardTitle>{t("env.title")}</CardTitle>
              <CardDescription>{t("env.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                {missingEnvCount > 0 ? (
                  <span className="text-destructive">
                    {t("env.missingCount", { count: missingEnvCount })}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {t("env.allConfigured")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {initialData.envChecks.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-mono text-xs">{item.key}</span>
                    {item.configured ? (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                        {t("env.configured")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">{t("env.missing")}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="admin-ai-insights">
            <CardHeader>
              <CardTitle>{t("aiInsights.title")}</CardTitle>
              <CardDescription>{t("aiInsights.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">{t("aiInsights.totalEvents")}</p>
                  <p className="text-lg font-semibold">
                    {initialData.aiInsights.totalAiEventsThisMonth}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">{t("aiInsights.totalTokens")}</p>
                  <p className="text-lg font-semibold">
                    {initialData.aiInsights.totalTokensThisMonth}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">{t("aiInsights.cacheEntries")}</p>
                  <p className="text-lg font-semibold">
                    {initialData.aiInsights.promptCacheActiveEntries}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">{t("aiInsights.cacheHits")}</p>
                  <p className="text-lg font-semibold">
                    {initialData.aiInsights.promptCacheTotalHits}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("aiInsights.columns.feature")}</TableHead>
                    <TableHead>{t("aiInsights.columns.calls")}</TableHead>
                    <TableHead>{t("aiInsights.columns.tokens")}</TableHead>
                    <TableHead>{t("aiInsights.columns.totalCost")}</TableHead>
                    <TableHead>{t("aiInsights.columns.avgCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.aiInsights.topCostFeatures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center">
                        {t("aiInsights.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.aiInsights.topCostFeatures.map((item) => (
                      <TableRow key={item.feature}>
                        <TableCell className="font-mono text-xs">{item.feature}</TableCell>
                        <TableCell>{item.calls}</TableCell>
                        <TableCell>{item.totalTokens}</TableCell>
                        <TableCell>{formatUsd(item.totalCostUsd)}</TableCell>
                        <TableCell>{formatUsd(item.avgCostUsd)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card data-testid="admin-billing-table">
            <CardHeader>
              <CardTitle>{t("billing.title")}</CardTitle>
              <CardDescription>
                {t("billing.description", { month: initialData.currentUsageMonth })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.columns.user")}</TableHead>
                    <TableHead>{t("billing.columns.plan")}</TableHead>
                    <TableHead>{t("billing.columns.status")}</TableHead>
                    <TableHead>{t("billing.columns.periodEnd")}</TableHead>
                    <TableHead>{t("billing.columns.cancelAtEnd")}</TableHead>
                    <TableHead>{t("billing.columns.usage")}</TableHead>
                    <TableHead>{t("billing.columns.stripe")}</TableHead>
                    <TableHead>{t("billing.columns.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground text-center">
                        {t("billing.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const rowMessage = messages[row.userId];
                      const isSaving = savingUserId === row.userId && isPending;

                      return (
                        <TableRow key={row.userId} data-testid={`admin-billing-row-${row.userId}`}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{row.email}</p>
                              {row.name && (
                                <p className="text-muted-foreground text-xs">{row.name}</p>
                              )}
                              <p className="text-muted-foreground font-mono text-[11px]">
                                {row.userId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <select
                              value={row.plan}
                              className="h-9 rounded-md border bg-transparent px-2 text-sm"
                              onChange={(event) =>
                                updateRow(row.userId, { plan: event.target.value as PlanTier })
                              }
                              data-testid={`admin-plan-${row.userId}`}
                            >
                              {PLAN_OPTIONS.map((plan) => (
                                <option key={plan} value={plan}>
                                  {plan}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="align-top">
                            <select
                              value={row.status}
                              className="h-9 rounded-md border bg-transparent px-2 text-sm"
                              onChange={(event) =>
                                updateRow(row.userId, {
                                  status: event.target.value as SubscriptionStatus,
                                })
                              }
                              data-testid={`admin-status-${row.userId}`}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="date"
                              value={row.currentPeriodEndInput}
                              onChange={(event) =>
                                updateRow(row.userId, { currentPeriodEndInput: event.target.value })
                              }
                              data-testid={`admin-period-end-${row.userId}`}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <label className="flex h-9 items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={row.cancelAtPeriodEnd}
                                onChange={(event) =>
                                  updateRow(row.userId, {
                                    cancelAtPeriodEnd: event.target.checked,
                                  })
                                }
                                data-testid={`admin-cancel-end-${row.userId}`}
                              />
                              {t("billing.cancelAtEnd")}
                            </label>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2">
                              <Input
                                type="number"
                                min={0}
                                value={row.crossPostsUsed}
                                onChange={(event) =>
                                  updateRow(row.userId, {
                                    crossPostsUsed: Number(event.target.value) || 0,
                                  })
                                }
                                data-testid={`admin-crossposts-${row.userId}`}
                              />
                              <Input
                                type="number"
                                min={0}
                                value={row.aiCallsUsed}
                                onChange={(event) =>
                                  updateRow(row.userId, {
                                    aiCallsUsed: Number(event.target.value) || 0,
                                  })
                                }
                                data-testid={`admin-aicalls-${row.userId}`}
                              />
                              <p className="text-muted-foreground text-xs">
                                {t("billing.usageMonth", { month: row.usageMonth })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-xs">
                              <p className="font-mono">{row.stripeCustomerId ?? "—"}</p>
                              <p className="text-muted-foreground font-mono">
                                {row.stripeSubscriptionId ?? "—"}
                              </p>
                              <p className="text-muted-foreground">
                                {t("billing.updatedAt", {
                                  date: formatDateTime(row.subscriptionUpdatedAt),
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave(row)}
                                disabled={isSaving}
                                data-testid={`admin-save-${row.userId}`}
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("billing.saving")}
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t("billing.save")}
                                  </>
                                )}
                              </Button>
                              {rowMessage?.type === "success" && (
                                <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {rowMessage.text}
                                </p>
                              )}
                              {rowMessage?.type === "error" && (
                                <p className="text-destructive text-xs">{rowMessage.text}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("logs.crossPosts.title")}</CardTitle>
              <CardDescription>{t("logs.crossPosts.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("logs.columns.time")}</TableHead>
                    <TableHead>{t("logs.columns.user")}</TableHead>
                    <TableHead>{t("logs.columns.platform")}</TableHead>
                    <TableHead>{t("logs.columns.status")}</TableHead>
                    <TableHead>{t("logs.columns.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.crossPostEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center">
                        {t("logs.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.crossPostEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDateTime(event.updatedAt ?? event.createdAt)}</TableCell>
                        <TableCell>{event.userEmail}</TableCell>
                        <TableCell>{event.platform}</TableCell>
                        <TableCell>
                          <StatusBadge status={event.status} />
                        </TableCell>
                        <TableCell className="max-w-[440px] truncate">
                          {event.contentSnippet ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("logs.scheduleFailures.title")}</CardTitle>
              <CardDescription>{t("logs.scheduleFailures.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("logs.columns.time")}</TableHead>
                    <TableHead>{t("logs.columns.user")}</TableHead>
                    <TableHead>{t("logs.columns.platform")}</TableHead>
                    <TableHead>{t("logs.columns.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.scheduleFailures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center">
                        {t("logs.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.scheduleFailures.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          {formatDateTime(event.updatedAt ?? event.scheduledAt)}
                        </TableCell>
                        <TableCell>{event.userEmail}</TableCell>
                        <TableCell>{event.platform ?? "—"}</TableCell>
                        <TableCell>{event.targetType ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("logs.sourceFailures.title")}</CardTitle>
              <CardDescription>{t("logs.sourceFailures.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("logs.columns.time")}</TableHead>
                    <TableHead>{t("logs.columns.user")}</TableHead>
                    <TableHead>{t("logs.columns.platform")}</TableHead>
                    <TableHead>{t("logs.columns.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.sourceFailures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center">
                        {t("logs.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.sourceFailures.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDateTime(event.updatedAt)}</TableCell>
                        <TableCell>{event.userEmail}</TableCell>
                        <TableCell>{event.sourceType}</TableCell>
                        <TableCell className="max-w-[440px] truncate">
                          {event.errorMessage
                            ? `${event.errorMessage} (${event.sourceUrl})`
                            : event.sourceUrl}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("logs.analyticsSync.title")}</CardTitle>
              <CardDescription>{t("logs.analyticsSync.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("logs.columns.time")}</TableHead>
                    <TableHead>{t("logs.columns.user")}</TableHead>
                    <TableHead>{t("logs.columns.platform")}</TableHead>
                    <TableHead>{t("logs.columns.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.analyticsSyncEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center">
                        {t("logs.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.analyticsSyncEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDateTime(event.lastSyncedAt)}</TableCell>
                        <TableCell>{event.userEmail}</TableCell>
                        <TableCell>{event.platform}</TableCell>
                        <TableCell>
                          {formatDateTime(event.syncWindowStart)} →{" "}
                          {formatDateTime(event.syncWindowEnd)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
