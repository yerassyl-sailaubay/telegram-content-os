import { pgTable, pgEnum, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const aiModelEnum = pgEnum("ai_model", ["gemini-flash", "gemini-pro", "auto"]);

export const adaptationToneEnum = pgEnum("adaptation_tone", [
  "professional",
  "casual",
  "match-original",
]);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  timezone: varchar("timezone", { length: 100 }).default("UTC"),
  language: varchar("language", { length: 10 }).default("en"),
  aiModel: aiModelEnum("ai_model").default("auto"),
  adaptationTone: adaptationToneEnum("adaptation_tone").default("professional"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));
