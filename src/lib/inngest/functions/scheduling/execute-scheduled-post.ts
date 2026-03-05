import { inngest } from "../../client";
import { db } from "@/server/db";
import { schedules } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Inngest function that executes a scheduled post at the right time.
 *
 * Triggered by the "schedule/execute-post" event emitted by the scheduling engine.
 * The event's `ts` field ensures Inngest delivers it at the scheduled time.
 *
 * Flow:
 * 1. Fetch the schedule from DB
 * 2. Verify it's still pending (not cancelled)
 * 3. Mark as processing
 * 4. Emit platform-specific posting events (actual posting is Wave 3)
 * 5. Mark as completed
 */
export const executeScheduledPost = inngest.createFunction(
  {
    id: "schedule/execute-scheduled-post",
    retries: 3,
  },
  { event: "schedule/execute-post" },
  async ({ event, step }) => {
    const { scheduleId } = event.data as {
      scheduleId: string;
      userId: string;
    };

    // Step 1: Fetch schedule and verify it's still pending
    const schedule = await step.run("fetch-schedule", async () => {
      return db.query.schedules.findFirst({
        where: eq(schedules.id, scheduleId),
        with: {
          crossPost: true,
        },
      });
    });

    if (!schedule) {
      return { status: "skipped", reason: "Schedule not found" };
    }

    if (schedule.status !== "pending") {
      return {
        status: "skipped",
        reason: `Schedule status is ${schedule.status}, not pending`,
      };
    }

    // Step 2: Mark as processing
    await step.run("mark-processing", async () => {
      await db
        .update(schedules)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(schedules.id, scheduleId));
    });

    // Step 3: Emit platform-specific posting event
    // Actual posting implementation is deferred to Wave 3.
    // For now we just emit the intent event.
    await step.run("emit-post-event", async () => {
      if (schedule.crossPost) {
        await inngest.send({
          name: "platform/post-content",
          data: {
            scheduleId: schedule.id,
            crossPostId: schedule.crossPostId,
            userId: schedule.userId,
            platform: schedule.crossPost.platform,
            content: schedule.crossPost.adaptedContent,
          },
        });
      }
    });

    // Step 4: Mark as completed
    await step.run("mark-completed", async () => {
      await db
        .update(schedules)
        .set({
          status: "completed",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, scheduleId));
    });

    return {
      status: "completed",
      scheduleId,
      platform: schedule.crossPost?.platform,
    };
  },
);
