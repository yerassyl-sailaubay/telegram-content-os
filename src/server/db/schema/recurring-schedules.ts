import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { telegramChannels } from "./telegram-channels";

export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["daily", "weekly", "monthly"]);

export const recurringSchedules = pgTable(
  "recurring_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    channelId: uuid("channel_id").references(() => telegramChannels.id, { onDelete: "cascade" }),
    frequency: recurringFrequencyEnum().notNull(),
    /** 0=Sunday, 1=Monday, ..., 6=Saturday — used for weekly recurrence */
    dayOfWeek: integer("day_of_week"),
    /** 1–31 — used for monthly recurrence */
    dayOfMonth: integer("day_of_month"),
    /** Time in HH:mm format stored in UTC */
    timeUtc: varchar("time_utc", { length: 5 }).notNull(),
    /** IANA timezone string, e.g. "Asia/Almaty" */
    timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
    /** Platforms to publish to */
    platforms: text("platforms").array().notNull(),
    /** Optional content template reference */
    contentTemplateId: uuid("content_template_id"),
    /** Whether the schedule is currently active */
    isActive: boolean("is_active").notNull().default(true),
    /** When the cron last processed this schedule */
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    /** Pre-computed next occurrence in UTC */
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("recurring_schedules_active_next_run_idx").on(table.isActive, table.nextRunAt),
    index("recurring_schedules_user_id_idx").on(table.userId),
    index("recurring_schedules_channel_id_idx").on(table.channelId),
  ],
);

export const recurringSchedulesRelations = relations(recurringSchedules, ({ one }) => ({
  user: one(users, {
    fields: [recurringSchedules.userId],
    references: [users.id],
  }),
  channel: one(telegramChannels, {
    fields: [recurringSchedules.channelId],
    references: [telegramChannels.id],
  }),
}));
