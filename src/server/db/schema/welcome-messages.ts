import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { telegramChannels } from "./telegram-channels";

export const welcomeMessages = pgTable("welcome_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id")
    .references(() => telegramChannels.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  language: varchar("language", { length: 10 }).default("ru"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const welcomeMessagesRelations = relations(welcomeMessages, ({ one }) => ({
  channel: one(telegramChannels, {
    fields: [welcomeMessages.channelId],
    references: [telegramChannels.id],
  }),
}));
