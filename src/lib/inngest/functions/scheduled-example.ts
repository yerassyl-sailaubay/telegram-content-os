import { inngest } from "../client";

export const scheduledExample = inngest.createFunction(
  { id: "scheduled/example" },
  { cron: "* * * * *" },
  async ({ step }) => {
    const executedAt = new Date().toISOString();

    await step.run("log-timestamp", async () => {
      console.log(`Scheduled function executed at: ${executedAt}`);
    });

    return {
      executedAt,
    };
  },
);
