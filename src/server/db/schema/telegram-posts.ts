import {
  pgTable,
  uuid,
  integer,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { telegramChannels } from "./telegram-channels";
import { crossPosts } from "./cross-posts";

export const telegramPosts = pgTable("telegram_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id")
    .references(() => telegramChannels.id, { onDelete: "cascade" })
    .notNull(),
  telegramMessageId: integer("telegram_message_id"),
  contentRaw: text("content_raw"),
  contentParsed: jsonb("content_parsed"),
  mediaUrls: jsonb("media_urls").default([]),
  views: integer("views").default(0),
  forwards: integer("forwards").default(0),
  reactions: jsonb("reactions").default({}),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const telegramPostsRelations = relations(
  telegramPosts,
  ({ one, many }) => ({
    channel: one(telegramChannels, {
      fields: [telegramPosts.channelId],
      references: [telegramChannels.id],
    }),
    crossPosts: many(crossPosts),
  }),
);
