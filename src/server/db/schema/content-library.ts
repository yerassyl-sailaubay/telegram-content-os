import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const contentLibraryRelations = relations(
  contentLibrary,
  ({ one }) => ({
    user: one(users, {
      fields: [contentLibrary.userId],
      references: [users.id],
    }),
  }),
);
