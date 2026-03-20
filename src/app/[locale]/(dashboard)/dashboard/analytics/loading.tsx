import {
  PageHeaderSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-variants";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <>
      <PageHeaderSkeleton className="mb-8" />

      <div className="space-y-8 pb-10">
        <section className="space-y-4">
          <div>
            <Skeleton className="mb-2 h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-3xl" />
          </div>

          <div className="mt-6 space-y-6">
            {/* Filter Bar */}
            <div className="border-border/70 bg-card/95 flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 w-[200px] rounded-md" />
                <div className="flex gap-1">
                  <Skeleton className="h-9 w-12 rounded-md" />
                  <Skeleton className="h-9 w-12 rounded-md" />
                  <Skeleton className="h-9 w-12 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>

            {/* Insight Cards */}
            <div className="grid gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border-border/70 bg-card/95 space-y-4 rounded-3xl border p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartSkeleton />
              <div className="bg-card text-card-foreground space-y-4 rounded-xl border p-6 shadow">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-[35%]" />
                </div>
                <Skeleton className="h-3 w-48" />
                <div className="h-48 pt-4">
                  <Skeleton className="h-full w-full rounded-md" />
                </div>
              </div>
            </div>

            {/* Table */}
            <TableSkeleton rows={5} />
          </div>
        </section>
      </div>
    </>
  );
}
