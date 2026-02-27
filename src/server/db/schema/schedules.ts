import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { crossPosts } from "./cross-posts";

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const schedules = pgTable("schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  crossPostId: uuid("cross_post_id")
    .references(() => crossPosts.id, { onDelete: "cascade" })
    .notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: varchar("recurrence_rule", { length: 255 }),
  status: scheduleStatusEnum().default("pending"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
  crossPost: one(crossPosts, {
    fields: [schedules.crossPostId],
    references: [crossPosts.id],
  }),
}));
