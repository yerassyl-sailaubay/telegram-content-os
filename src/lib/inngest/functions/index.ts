import { helloWorld } from "./hello-world";
import { scheduledExample } from "./scheduled-example";
import { telegramPostReceived } from "./telegram/post-received";

import { executeScheduledPost } from "./scheduling/execute-scheduled-post";
export const functions = [helloWorld, scheduledExample, telegramPostReceived, executeScheduledPost];
