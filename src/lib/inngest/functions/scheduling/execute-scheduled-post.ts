import { inngest } from "../../client";
import { db } from "@/server/db";
import { platformConnections, schedules } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

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

    // Step 1: Fetch schedule.
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

    if (
      schedule.status === "cancelled" ||
      schedule.status === "completed" ||
      schedule.status === "failed"
    ) {
      return {
        status: "skipped",
        reason: `Schedule status is ${schedule.status}`,
      };
    }

    // Step 2: Mark as processing
    await step.run("mark-processing", async () => {
      if (schedule.status === "pending") {
        await db
          .update(schedules)
          .set({ status: "processing", updatedAt: new Date() })
          .where(eq(schedules.id, scheduleId));
      }
    });

    let dispatchedPlatform: "linkedin" | "twitter";
    try {
      // Step 3: Emit platform-specific posting event.
      const dispatchResult = await step.run("emit-post-event", async () => {
        if (!schedule.crossPost || !schedule.crossPostId) {
          throw new Error("Schedule does not have an associated cross-post");
        }

        if (!schedule.crossPost.adaptedContent) {
          throw new Error("Cross-post has no adapted content to publish");
        }

        if (schedule.crossPost.platform === "linkedin") {
          await inngest.send({
            name: "platform/linkedin.post",
            data: {
              crossPostId: schedule.crossPostId,
              userId: schedule.userId,
              content: schedule.crossPost.adaptedContent,
            },
          });

          return { platform: "linkedin" as const };
        }

        const [twitterConnection] = await db
          .select({ id: platformConnections.id })
          .from(platformConnections)
          .where(
            and(
              eq(platformConnections.userId, schedule.userId),
              eq(platformConnections.platform, "twitter"),
            ),
          )
          .limit(1);

        if (!twitterConnection) {
          throw new Error("Twitter connection not found");
        }

        await inngest.send({
          name: "platform/twitter.post",
          data: {
            crossPostId: schedule.crossPostId,
            userId: schedule.userId,
            connectionId: twitterConnection.id,
            content: schedule.crossPost.adaptedContent,
          },
        });

        return { platform: "twitter" as const };
      });

      dispatchedPlatform = dispatchResult.platform;
    } catch (error) {
      await step.run("mark-failed", async () => {
        await db
          .update(schedules)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(schedules.id, scheduleId));
      });

      throw error;
    }

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
      platform: dispatchedPlatform,
    };
  },
);
