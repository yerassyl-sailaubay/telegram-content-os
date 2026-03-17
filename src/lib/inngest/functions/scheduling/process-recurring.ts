import { inngest } from "../../client";

/**
 * Inngest cron function: process-recurring-schedules
 *
 * Runs every 15 minutes. Finds active recurring schedules whose
 * next_run_at is within the processing window and creates individual
 * scheduled posts for each occurrence.
 *
 * Flow:
 * 1. Query active recurring schedules due within next 15 minutes
 * 2. For each schedule, check if a post already exists (deduplicate)
 * 3. Create cross_post + schedule entries for new occurrences
 * 4. Advance each recurring schedule's next_run_at
 */
export const processRecurringSchedules = inngest.createFunction(
  {
    id: "scheduling/process-recurring",
    retries: 2,
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    // Step 1: Get all due recurring schedules
    const dueSchedules = await step.run("get-due-schedules", async () => {
      const { recurringSchedules } = await import("@/server/db/schema");
      const { db } = await import("@/server/db");
      const { eq, and, lte } = await import("drizzle-orm");

      const windowEnd = new Date(Date.now() + 15 * 60 * 1000);

      const rows = await db
        .select()
        .from(recurringSchedules)
        .where(
          and(eq(recurringSchedules.isActive, true), lte(recurringSchedules.nextRunAt, windowEnd)),
        );

      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        channelId: r.channelId,
        frequency: r.frequency,
        dayOfWeek: r.dayOfWeek,
        dayOfMonth: r.dayOfMonth,
        timeUtc: r.timeUtc,
        timezone: r.timezone,
        platforms: r.platforms,
        contentTemplateId: r.contentTemplateId,
        nextRunAt: r.nextRunAt?.toISOString() ?? null,
      }));
    });

    if (dueSchedules.length === 0) {
      return { status: "idle", processed: 0 };
    }

    // Step 2: Process each recurring schedule
    let created = 0;
    let skipped = 0;

    for (const recurring of dueSchedules) {
      const result = await step.run(`process-schedule-${recurring.id}`, async () => {
        const { db } = await import("@/server/db");
        const { schedules, crossPosts, recurringSchedules } = await import("@/server/db/schema");
        const { eq, and, gte, lte } = await import("drizzle-orm");
        const { getNextOccurrence } = await import("@/lib/scheduling/recurring");

        if (!recurring.nextRunAt) {
          return { action: "skipped", reason: "no nextRunAt" };
        }

        const occurrenceTime = new Date(recurring.nextRunAt);

        // Deduplicate: check if a schedule with this recurrenceRule + time already exists
        const toleranceMs = 60_000;
        const lower = new Date(occurrenceTime.getTime() - toleranceMs);
        const upper = new Date(occurrenceTime.getTime() + toleranceMs);

        const existing = await db
          .select({ id: schedules.id })
          .from(schedules)
          .where(
            and(
              eq(schedules.recurrenceRule, recurring.id),
              gte(schedules.scheduledAt, lower),
              lte(schedules.scheduledAt, upper),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          // Already created — just advance the schedule
          const now = new Date();
          const nextRunAt = getNextOccurrence(
            recurring.frequency,
            recurring.timeUtc,
            recurring.timezone,
            recurring.dayOfWeek,
            recurring.dayOfMonth,
            now,
          );

          await db
            .update(recurringSchedules)
            .set({ lastRunAt: now, nextRunAt, updatedAt: now })
            .where(eq(recurringSchedules.id, recurring.id));

          return { action: "skipped", reason: "duplicate" };
        }

        // Create cross_post entries for each platform
        const crossPostIds: Record<string, string> = {};

        for (const platform of recurring.platforms) {
          const [cp] = await db
            .insert(crossPosts)
            .values({
              userId: recurring.userId,
              platform: platform as "linkedin" | "twitter",
              status: "scheduled",
            })
            .returning({ id: crossPosts.id });

          if (cp) {
            crossPostIds[platform] = cp.id;
          }
        }

        // Create a schedule entry for each cross_post and capture the created schedule IDs.
        const scheduleEvents: Array<{ platform: string; scheduleId: string }> = [];
        for (const [platform, crossPostId] of Object.entries(crossPostIds)) {
          const [schedule] = await db
            .insert(schedules)
            .values({
              userId: recurring.userId,
              crossPostId,
              scheduledAt: occurrenceTime,
              timezone: recurring.timezone,
              isRecurring: true,
              recurrenceRule: recurring.id,
              status: "pending",
            })
            .returning({ id: schedules.id });

          if (!schedule) {
            throw new Error(`Failed to create schedule for recurring job ${recurring.id}`);
          }

          scheduleEvents.push({
            platform,
            scheduleId: schedule.id,
          });
        }

        // Advance recurring schedule
        const now = new Date();
        const nextRunAt = getNextOccurrence(
          recurring.frequency,
          recurring.timeUtc,
          recurring.timezone,
          recurring.dayOfWeek,
          recurring.dayOfMonth,
          now,
        );

        await db
          .update(recurringSchedules)
          .set({ lastRunAt: now, nextRunAt, updatedAt: now })
          .where(eq(recurringSchedules.id, recurring.id));

        // Emit execute events for each scheduled post
        const { inngest: inngestClient } = await import("@/lib/inngest/client");

        for (const { scheduleId } of scheduleEvents) {
          await inngestClient.send({
            name: "schedule/execute-post",
            data: {
              scheduleId,
              userId: recurring.userId,
            },
            ts: occurrenceTime.getTime(),
          });
        }

        return {
          action: "created",
          platforms: scheduleEvents.map((item) => item.platform),
          scheduledAt: occurrenceTime.toISOString(),
        };
      });

      if (result.action === "created") {
        created++;
      } else {
        skipped++;
      }
    }

    return {
      status: "completed",
      processed: dueSchedules.length,
      created,
      skipped,
    };
  },
);
