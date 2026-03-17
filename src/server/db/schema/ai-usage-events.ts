import {
  pgTable,
  uuid,
  varchar,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { telegramChannels } from "./telegram-channels";
import { contentLibrary } from "./content-library";

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    channelId: uuid("channel_id").references(() => telegramChannels.id, { onDelete: "set null" }),
    contentId: uuid("content_id").references(() => contentLibrary.id, { onDelete: "set null" }),
    feature: varchar("feature", { length: 64 }).notNull(),
    modelId: varchar("model_id", { length: 255 }).notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    inputCostUsd: doublePrecision("input_cost_usd").notNull().default(0),
    outputCostUsd: doublePrecision("output_cost_usd").notNull().default(0),
    totalCostUsd: doublePrecision("total_cost_usd").notNull().default(0),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("ai_usage_events_user_created_at_idx").on(table.userId, table.createdAt),
    index("ai_usage_events_feature_created_at_idx").on(table.feature, table.createdAt),
    index("ai_usage_events_channel_created_at_idx").on(table.channelId, table.createdAt),
  ],
);

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageEvents.userId],
    references: [users.id],
  }),
  channel: one(telegramChannels, {
    fields: [aiUsageEvents.channelId],
    references: [telegramChannels.id],
  }),
  content: one(contentLibrary, {
    fields: [aiUsageEvents.contentId],
    references: [contentLibrary.id],
  }),
}));
