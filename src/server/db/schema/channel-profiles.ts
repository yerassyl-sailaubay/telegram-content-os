import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { telegramChannels } from "./telegram-channels";

export const channelProfiles = pgTable("channel_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id")
    .references(() => telegramChannels.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  niche: varchar("niche", { length: 255 }),
  tone: varchar("tone", { length: 255 }),
  topTopics: jsonb("top_topics").default([]),
  language: varchar("language", { length: 10 }).default("ru"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const channelProfilesRelations = relations(
  channelProfiles,
  ({ one }) => ({
    channel: one(telegramChannels, {
      fields: [channelProfiles.channelId],
      references: [telegramChannels.id],
    }),
  }),
);
