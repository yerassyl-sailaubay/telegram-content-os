import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
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

export const contentLibrary = pgTable(
  "content_library",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    parentId: uuid("parent_id"),
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
  },
  (table) => [
    index("content_library_user_created_at_idx").on(table.userId, table.createdAt),
    index("content_library_user_updated_created_at_idx").on(
      table.userId,
      table.updatedAt,
      table.createdAt,
    ),
    index("content_library_user_status_created_at_idx").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
    index("content_library_user_category_idx").on(table.userId, table.category),
    index("content_library_channel_id_idx").on(table.channelId),
    index("content_library_parent_id_idx").on(table.parentId),
  ],
);

export const contentLibraryRelations = relations(contentLibrary, ({ one, many }) => ({
  user: one(users, {
    fields: [contentLibrary.userId],
    references: [users.id],
  }),
  channel: one(telegramChannels, {
    fields: [contentLibrary.channelId],
    references: [telegramChannels.id],
  }),
  parent: one(contentLibrary, {
    fields: [contentLibrary.parentId],
    references: [contentLibrary.id],
    relationName: "parentChildren",
  }),
  children: many(contentLibrary, {
    relationName: "parentChildren",
  }),
}));
