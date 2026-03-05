import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { telegramPosts } from "./telegram-posts";
import { schedules } from "./schedules";
import { platformEnum } from "./platform-connections";

export const crossPostStatusEnum = pgEnum("cross_post_status", [
  "draft",
  "scheduled",
  "posted",
  "failed",
]);

export const crossPosts = pgTable(
  "cross_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sourcePostId: uuid("source_post_id")
      .references(() => telegramPosts.id, { onDelete: "set null" }),
    platform: platformEnum().notNull(),
    adaptedContent: text("adapted_content"),
    originalLanguage: varchar("original_language", { length: 10 }).default("ru"),
    targetLanguage: varchar("target_language", { length: 10 }).default("en"),
    aiModelUsed: varchar("ai_model_used", { length: 255 }),
    platformPostId: varchar("platform_post_id", { length: 255 }),
    status: crossPostStatusEnum().default("draft"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    engagementData: jsonb("engagement_data").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("cross_posts_user_created_at_idx").on(table.userId, table.createdAt),
    index("cross_posts_user_status_idx").on(table.userId, table.status),
    index("cross_posts_source_post_id_idx").on(table.sourcePostId),
    index("cross_posts_platform_post_id_idx").on(table.platformPostId),
  ],
);

export const crossPostsRelations = relations(
  crossPosts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [crossPosts.userId],
      references: [users.id],
    }),
    sourcePost: one(telegramPosts, {
      fields: [crossPosts.sourcePostId],
      references: [telegramPosts.id],
    }),
    schedules: many(schedules),
  }),
);
