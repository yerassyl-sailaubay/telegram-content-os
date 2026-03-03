import { Skeleton } from "@/components/ui/skeleton";

function WizardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Step nav skeleton */}
      <div className="bg-muted/30 flex items-center gap-3 rounded-lg border px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-16" />
            {i < 4 && <Skeleton className="h-3 w-2" />}
          </div>
        ))}
      </div>

      {/* Platform selector skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Post list skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CrossPostLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <WizardSkeleton />
    </div>
  );
}
