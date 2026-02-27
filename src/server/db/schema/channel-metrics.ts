import {
  pgTable,
  uuid,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { telegramChannels } from "./telegram-channels";
import { platformEnum } from "./platform-connections";

export const channelMetrics = pgTable("channel_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id")
    .references(() => telegramChannels.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum().notNull(),
  date: date("date").notNull(),
  totalPosts: integer("total_posts").default(0).notNull(),
  totalEngagement: integer("total_engagement").default(0).notNull(),
  followerCountSnapshot: integer("follower_count_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const channelMetricsRelations = relations(
  channelMetrics,
  ({ one }) => ({
    channel: one(telegramChannels, {
      fields: [channelMetrics.channelId],
      references: [telegramChannels.id],
    }),
  }),
);
