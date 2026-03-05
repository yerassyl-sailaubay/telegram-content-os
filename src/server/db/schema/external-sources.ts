import { pgTable, pgEnum, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { contentLibrary } from "./content-library";

export const externalSourceTypeEnum = pgEnum("external_source_type", [
  "youtube",
  "article",
  "podcast",
]);

export const sourceProcessingStatusEnum = pgEnum("source_processing_status", [
  "pending",
  "extracting",
  "extracted",
  "generating",
  "completed",
  "failed",
]);

export const externalSources = pgTable("external_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sourceUrl: varchar("source_url", { length: 2048 }).notNull(),
  sourceType: externalSourceTypeEnum("source_type").notNull(),
  title: varchar("title", { length: 500 }),
  extractedText: text("extracted_text"),
  extractedMetadata: jsonb("extracted_metadata"),
  processingStatus: sourceProcessingStatusEnum("processing_status").default("pending"),
  errorMessage: text("error_message"),
  linkedDraftId: uuid("linked_draft_id").references(() => contentLibrary.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const externalSourcesRelations = relations(externalSources, ({ one }) => ({
  user: one(users, {
    fields: [externalSources.userId],
    references: [users.id],
  }),
  linkedDraft: one(contentLibrary, {
    fields: [externalSources.linkedDraftId],
    references: [contentLibrary.id],
  }),
}));
