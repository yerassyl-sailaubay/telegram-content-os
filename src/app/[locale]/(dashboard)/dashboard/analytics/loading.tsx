import {
  PageHeaderSkeleton,
  StatsRowSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-variants";

export default function AnalyticsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatsRowSkeleton count={4} />
      <ChartSkeleton />
      <TableSkeleton rows={4} />
    </>
  );
}
