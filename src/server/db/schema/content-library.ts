import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { telegramChannels } from "./telegram-channels";

export const contentSourceTypeEnum = pgEnum("content_source_type", [
  "telegram_import",
  "idea",
  "repurposed",
  "external_source",
  "ai_generated",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
  "archived",
  "scheduled",
]);

export const contentLibrary = pgTable("content_library", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  category: varchar("category", { length: 255 }),
  tags: jsonb("tags").default([]),
  isTemplate: boolean("is_template").default(false),
  sourceType: contentSourceTypeEnum("source_type"),
  status: contentStatusEnum().default("draft"),
  channelId: uuid("channel_id").references(() => telegramChannels.id, { onDelete: "set null" }),
  sourceUrl: varchar("source_url", { length: 2048 }),
  sourceMetadata: jsonb("source_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const contentLibraryRelations = relations(contentLibrary, ({ one }) => ({
  user: one(users, {
    fields: [contentLibrary.userId],
    references: [users.id],
  }),
  channel: one(telegramChannels, {
    fields: [contentLibrary.channelId],
    references: [telegramChannels.id],
  }),
}));
