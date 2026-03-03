import { Skeleton } from "@/components/ui/skeleton";

export default function ContentLoading() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Skeleton className="h-9 max-w-sm flex-1" />
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-[140px]" />
          <Skeleton className="h-8 w-[110px]" />
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 flex-1" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
