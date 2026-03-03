import { PageHeaderSkeleton, CalendarSkeleton } from "@/components/ui/skeleton-variants";

export default function ScheduleLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CalendarSkeleton />
    </>
  );
}
