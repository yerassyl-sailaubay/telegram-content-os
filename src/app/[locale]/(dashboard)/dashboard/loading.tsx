import { PageHeaderSkeleton, ChartSkeleton } from "@/components/ui/skeleton-variants";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <PageHeaderSkeleton className="mb-8" />

      <div className="space-y-8 pb-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          {/* Hero Section Skeleton */}
          <div className="bg-card text-card-foreground space-y-6 rounded-[1.75rem] border p-6 shadow sm:p-8">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-3/4 max-w-[400px]" />
            </div>
            {/* Quick Actions Skeleton */}
            <div className="flex gap-3 py-2">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
            {/* Hero Stats */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Skeleton className="h-[104px] w-full rounded-3xl" />
              <Skeleton className="h-[104px] w-full rounded-3xl" />
              <Skeleton className="h-[104px] w-full rounded-3xl" />
              <Skeleton className="h-[104px] w-full rounded-3xl" />
            </div>
          </div>

          {/* Quick Capture Skeleton */}
          <div className="bg-card text-card-foreground flex flex-col space-y-4 rounded-[1.75rem] border p-6 shadow">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="mt-2 flex-1">
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="border-border/50 mt-8 space-y-3 border-t pt-5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          {/* Upcoming Posts Skeleton */}
          <div className="bg-card text-card-foreground rounded-[1.75rem] border p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed Skeleton */}
          <div className="bg-card text-card-foreground rounded-[1.75rem] border p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="mt-1 h-3 w-3 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ChartSkeleton />
        </div>
      </div>
    </>
  );
}
