import { pgTable, pgEnum, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { crossPosts } from "./cross-posts";
import { contentLibrary } from "./content-library";
import { telegramChannels } from "./telegram-channels";

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const scheduleTargetTypeEnum = pgEnum("schedule_target_type", [
  "cross_post",
  "telegram_publish",
]);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    crossPostId: uuid("cross_post_id").references(() => crossPosts.id, { onDelete: "cascade" }),
    contentLibraryId: uuid("content_library_id").references(() => contentLibrary.id, {
      onDelete: "cascade",
    }),
    targetType: scheduleTargetTypeEnum("target_type").default("cross_post"),
    channelId: uuid("channel_id").references(() => telegramChannels.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 50 }).default("UTC"),
    isRecurring: boolean("is_recurring").default(false),
    recurrenceRule: varchar("recurrence_rule", { length: 255 }),
    status: scheduleStatusEnum().default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("schedules_user_status_scheduled_at_idx").on(
      table.userId,
      table.status,
      table.scheduledAt,
    ),
    index("schedules_recurrence_scheduled_at_idx").on(table.recurrenceRule, table.scheduledAt),
    index("schedules_cross_post_id_idx").on(table.crossPostId),
    index("schedules_content_library_id_idx").on(table.contentLibraryId),
    index("schedules_channel_id_idx").on(table.channelId),
  ],
);

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
  crossPost: one(crossPosts, {
    fields: [schedules.crossPostId],
    references: [crossPosts.id],
  }),
  contentLibraryItem: one(contentLibrary, {
    fields: [schedules.contentLibraryId],
    references: [contentLibrary.id],
  }),
  channel: one(telegramChannels, {
    fields: [schedules.channelId],
    references: [telegramChannels.id],
  }),
}));
