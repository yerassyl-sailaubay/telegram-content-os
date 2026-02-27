import { helloWorld } from "./hello-world";
import { scheduledExample } from "./scheduled-example";
import { telegramPostReceived } from "./telegram/post-received";

import { executeScheduledPost } from "./scheduling/execute-scheduled-post";
import { profileChannel } from "./ai/profile-channel";
import { adaptContent } from "./ai/adapt-content";
export const functions = [helloWorld, scheduledExample, telegramPostReceived, executeScheduledPost, profileChannel, adaptContent];
