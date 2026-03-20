import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  { id: "test/hello-world" },
  { event: "test/hello" },
  async ({ event, step }) => {
    await step.run("log-message", async () => {
      console.log("Hello from Inngest!");
    });

    return {
      message: "Hello World",
      timestamp: new Date().toISOString(),
    };
  },
);
