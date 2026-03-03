import {
  PageHeaderSkeleton,
  StatsRowSkeleton,
  CardSkeleton,
  ChartSkeleton,
} from "@/components/ui/skeleton-variants";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-8">
      <PageHeaderSkeleton />
      <StatsRowSkeleton count={4} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ChartSkeleton />
        </div>
        <div className="flex flex-col gap-6">
          <CardSkeleton count={1} />
          <CardSkeleton count={1} />
        </div>
      </div>
    </div>
  );
}
