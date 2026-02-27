import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-8 w-56" />
      </div>

      {/* Calendar grid skeleton */}
      <div className="overflow-hidden rounded-lg border">
        {/* Day names */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-2 text-center">
              <Skeleton className="mx-auto h-4 w-8" />
            </div>
          ))}
        </div>
        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[100px] border-b border-r p-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="mt-2 space-y-1">
                {i % 5 === 0 && <Skeleton className="h-4 w-full" />}
                {i % 7 === 2 && <Skeleton className="h-4 w-3/4" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
