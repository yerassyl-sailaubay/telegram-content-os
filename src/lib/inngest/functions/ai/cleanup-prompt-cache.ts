import { inngest } from "@/lib/inngest/client";

const CLEANUP_BATCH_SIZE = 500;
const MAX_BATCHES_PER_RUN = 20;

export const cleanupPromptCache = inngest.createFunction(
  {
    id: "ai/cleanup-prompt-cache",
    retries: 1,
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const now = new Date();

    const result = await step.run("delete-expired-cache-rows", async () => {
      const { db } = await import("@/server/db");
      const { aiPromptCache } = await import("@/server/db/schema");
      const { asc, inArray, lte } = await import("drizzle-orm");

      let deletedRows = 0;
      let batches = 0;

      while (batches < MAX_BATCHES_PER_RUN) {
        const expiredRows = await db
          .select({ id: aiPromptCache.id })
          .from(aiPromptCache)
          .where(lte(aiPromptCache.expiresAt, now))
          .orderBy(asc(aiPromptCache.expiresAt))
          .limit(CLEANUP_BATCH_SIZE);

        if (expiredRows.length === 0) {
          break;
        }

        const ids = expiredRows.map((row) => row.id);
        await db.delete(aiPromptCache).where(inArray(aiPromptCache.id, ids));

        deletedRows += ids.length;
        batches += 1;

        if (expiredRows.length < CLEANUP_BATCH_SIZE) {
          break;
        }
      }

      return {
        deletedRows,
        batches,
        truncated: batches >= MAX_BATCHES_PER_RUN,
      };
    });

    return {
      status: "completed",
      checkedAt: now.toISOString(),
      deletedRows: result.deletedRows,
      batches: result.batches,
      batchSize: CLEANUP_BATCH_SIZE,
      maxBatches: MAX_BATCHES_PER_RUN,
      truncated: result.truncated,
    };
  },
);
