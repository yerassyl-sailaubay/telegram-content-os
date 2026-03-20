import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const mediaFiles = pgTable("media_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  storagePath: varchar("storage_path", { length: 1024 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }),
  sizeBytes: integer("size_bytes"),
  thumbnailUrl: varchar("thumbnail_url", { length: 1024 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  user: one(users, {
    fields: [mediaFiles.userId],
    references: [users.id],
  }),
}));
