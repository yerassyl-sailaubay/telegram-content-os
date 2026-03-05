import { PageHeaderSkeleton, CardSkeleton } from "@/components/ui/skeleton-variants";

export default function MediaLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardSkeleton count={6} />
    </>
  );
}
