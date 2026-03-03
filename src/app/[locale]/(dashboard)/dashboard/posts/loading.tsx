import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton-variants";

export default function PostsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} />
    </>
  );
}
