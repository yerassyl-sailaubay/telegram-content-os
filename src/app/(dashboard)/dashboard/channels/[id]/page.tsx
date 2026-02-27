import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelSettings } from "@/components/channels/channel-settings";
import { getChannelDetails, disconnectChannel } from "@/server/actions/channels";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Users,
  FileText,
  Calendar,
  Unplug,
} from "lucide-react";
import { redirect } from "next/navigation";

type ChannelDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChannelDetailPage({
  params,
}: ChannelDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations("channels");
  const tCommon = await getTranslations("common");

  const result = await getChannelDetails(id);

  if (!result.success) {
    notFound();
  }

  const { recentPosts, ...channel } = result.data;

  async function handleDisconnect() {
    "use server";
    const r = await disconnectChannel(id);
    if (r.success) {
      redirect("/dashboard/channels");
    }
  }

  return (
    <>
      <PageHeader
        title={channel.title ?? channel.username ?? channel.telegramChatId}
        description={
          channel.description ??
          (channel.username ? `@${channel.username}` : undefined)
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/channels">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {t("backToChannels")}
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Unplug className="mr-1.5 h-3.5 w-3.5" />
                  {t("disconnect")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("disconnectConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("disconnectConfirmDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                  <form action={handleDisconnect}>
                    <AlertDialogAction
                      type="submit"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("disconnect")}
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stats */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-semibold">
                    {(channel.memberCount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{channel.postCount}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {channel.lastPostAt
                      ? formatDistanceToNow(new Date(channel.lastPostAt))
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("lastPost")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("recentPosts")}</CardTitle>
              <CardDescription>
                Last {recentPosts.length} imported posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    {t("noRecentPosts")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <p className="line-clamp-2 text-sm">
                        {post.contentRaw ?? "—"}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {post.postedAt && (
                          <span>
                            {formatDistanceToNow(new Date(post.postedAt))}
                          </span>
                        )}
                        {typeof post.views === "number" && post.views > 0 && (
                          <span>{post.views.toLocaleString()} views</span>
                        )}
                        {typeof post.forwards === "number" &&
                          post.forwards > 0 && (
                            <span>{post.forwards} forwards</span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: settings + info */}
        <div className="space-y-4">
          <ChannelSettings channel={channel} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("channelInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  {t("statusActive")}
                </Badge>
              </div>
              {channel.connectedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("connectedOn")}
                  </span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(channel.connectedAt))}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
