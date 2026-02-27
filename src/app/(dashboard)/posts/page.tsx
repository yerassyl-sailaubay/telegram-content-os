import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ContentList } from "@/components/content/content-list";
import {
  listContent,
  getUserCategories,
} from "@/server/actions/content";
import ContentLoading from "./loading";

type PostsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const t = await getTranslations("content");
  const params = await searchParams;

  const page = parseInt(params.page ?? "1", 10);
  const sort = (params.sort as "newest" | "oldest") ?? "newest";

  const [contentResult, categoriesResult] = await Promise.all([
    listContent({
      page,
      search: params.q,
      category: params.category || undefined,
      sort,
    }),
    getUserCategories(),
  ]);

  if (!contentResult.success || !categoriesResult.success) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-destructive">
            {contentResult.success ? "" : contentResult.error}
            {categoriesResult.success ? "" : categoriesResult.error}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<ContentLoading />}>
        <ContentList
          initialData={contentResult.data}
          initialCategories={categoriesResult.data}
        />
      </Suspense>
    </>
  );
}
