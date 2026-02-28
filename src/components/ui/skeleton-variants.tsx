import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SkeletonVariantProps = {
  className?: string;
};

/**
 * Table skeleton — mimics a data table with header row + N body rows.
 */
export function TableSkeleton({ className, rows = 5 }: SkeletonVariantProps & { rows?: number }) {
  return (
    <div className={cn("w-full space-y-3", className)} data-testid="table-skeleton">
      {/* Table header */}
      <div className="bg-muted/30 flex items-center gap-4 rounded-lg border p-4">
        <Skeleton className="h-4 w-[30%]" />
        <Skeleton className="h-4 w-[20%]" />
        <Skeleton className="h-4 w-[20%]" />
        <Skeleton className="h-4 w-[15%]" />
        <Skeleton className="h-4 w-[15%]" />
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border p-4"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <Skeleton className="h-4 w-[30%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[15%]" />
          <Skeleton className="h-4 w-[15%]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton — mimics a content card with avatar, title, description, and actions.
 */
export function CardSkeleton({ className, count = 3 }: SkeletonVariantProps & { count?: number }) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      data-testid="card-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-xl border p-5"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-3 w-[40%]" />
            </div>
          </div>
          {/* Card body */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
          {/* Card footer */}
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-3 w-[25%]" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Chart skeleton — mimics a chart area with title, axes, and bars.
 */
export function ChartSkeleton({ className }: SkeletonVariantProps) {
  return (
    <div className={cn("space-y-4 rounded-xl border p-6", className)} data-testid="chart-skeleton">
      {/* Chart title */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-[35%]" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      {/* Chart area */}
      <div className="flex h-48 items-end gap-2 pt-4">
        {[40, 65, 30, 80, 55, 70, 45, 60, 35, 75, 50, 68].map((height, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${height}%`,
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

/**
 * Calendar skeleton — mimics a calendar grid with header and day cells.
 */
export function CalendarSkeleton({ className }: SkeletonVariantProps) {
  return (
    <div
      className={cn("space-y-4 rounded-xl border p-6", className)}
      data-testid="calendar-skeleton"
    >
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="mx-auto h-3 w-8" />
        ))}
      </div>
      {/* Calendar grid — 5 weeks */}
      {Array.from({ length: 5 }).map((_, week) => (
        <div key={week} className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, day) => (
            <Skeleton
              key={day}
              className="mx-auto h-10 w-10 rounded-md"
              style={{ animationDelay: `${(week * 7 + day) * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Stats row skeleton — mimics the quick stats cards row.
 */
export function StatsRowSkeleton({
  className,
  count = 4,
}: SkeletonVariantProps & { count?: number }) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
      data-testid="stats-row-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-xl border p-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <Skeleton className="h-3 w-[50%]" />
          <Skeleton className="h-7 w-[35%]" />
          <Skeleton className="h-2 w-[70%]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Page header skeleton — mimics the PageHeader component.
 */
export function PageHeaderSkeleton({ className }: SkeletonVariantProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
      data-testid="page-header-skeleton"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}

/**
 * Settings/Tabs skeleton — mimics a tabbed settings page.
 */
export function TabsSkeleton({ className }: SkeletonVariantProps) {
  return (
    <div className={cn("space-y-6", className)} data-testid="tabs-skeleton">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-md" />
        ))}
      </div>
      {/* Tab content */}
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-[30%]" />
        <Skeleton className="h-4 w-[60%]" />
        <div className="space-y-4 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
