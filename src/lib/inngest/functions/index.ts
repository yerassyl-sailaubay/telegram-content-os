import { helloWorld } from "./hello-world";
import { scheduledExample } from "./scheduled-example";
import { telegramPostReceived } from "./telegram/post-received";

import { executeScheduledPost } from "./scheduling/execute-scheduled-post";
import { profileChannel } from "./ai/profile-channel";
import { adaptContent } from "./ai/adapt-content";
import { collectLinkedInAnalytics } from "./analytics/collect-linkedin-analytics";
import { collectTwitterAnalytics } from "./analytics/collect-twitter-analytics";
import { collectTelegramAnalytics } from "./analytics/collect-telegram-analytics";
import { executeBroadcast } from "./broadcast";
import { processRecurringSchedules } from "./scheduling/process-recurring";
export const functions = [
  helloWorld,
  scheduledExample,
  telegramPostReceived,
  executeScheduledPost,
  profileChannel,
  adaptContent,
  collectLinkedInAnalytics,
  collectTwitterAnalytics,
  collectTelegramAnalytics,
  executeBroadcast,
  processRecurringSchedules,
];
