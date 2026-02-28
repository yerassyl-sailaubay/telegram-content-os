import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { telegramChannels } from "./telegram-channels";
import { users } from "./users";

export const welcomeTemplates = pgTable("welcome_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id")
    .references(() => telegramChannels.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  templateText: text("template_text").notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const welcomeTemplatesRelations = relations(
  welcomeTemplates,
  ({ one }) => ({
    channel: one(telegramChannels, {
      fields: [welcomeTemplates.channelId],
      references: [telegramChannels.id],
    }),
    user: one(users, {
      fields: [welcomeTemplates.userId],
      references: [users.id],
    }),
  }),
);
