import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subscriptions } from "./subscriptions";
import { telegramChannels } from "./telegram-channels";
import { platformConnections } from "./platform-connections";
import { crossPosts } from "./cross-posts";
import { schedules } from "./schedules";
import { contentLibrary } from "./content-library";
import { mediaFiles } from "./media-files";
import { telegramLinkTokens } from "./telegram-link-tokens";
import { usageTracking } from "./usage-tracking";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 1024 }),
  locale: varchar("locale", { length: 10 }).default("ru"),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).unique(),
  telegramLinkedAt: timestamp("telegram_linked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  telegramChannels: many(telegramChannels),
  platformConnections: many(platformConnections),
  crossPosts: many(crossPosts),
  schedules: many(schedules),
  contentLibrary: many(contentLibrary),
  mediaFiles: many(mediaFiles),
  telegramLinkTokens: many(telegramLinkTokens),
  usageTracking: many(usageTracking),
}));
