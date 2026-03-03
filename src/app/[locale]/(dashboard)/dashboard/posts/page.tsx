import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PostsEmptyState } from "@/components/posts/posts-empty-state";

export default async function PostsPage() {
  const t = await getTranslations("nav");

  return (
    <>
      <PageHeader title={t("posts")} />
      <PostsEmptyState />
    </>
  );
}
