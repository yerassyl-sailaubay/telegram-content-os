import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { telegramPosts } from "./telegram-posts";
import { channelProfiles } from "./channel-profiles";
import { welcomeMessages } from "./welcome-messages";

export const telegramChannels = pgTable(
  "telegram_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    telegramChatId: varchar("telegram_chat_id", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 255 }),
    username: varchar("username", { length: 255 }),
    description: text("description"),
    memberCount: integer("member_count").default(0),
    botTokenEncrypted: text("bot_token_encrypted"),
    webhookSecret: varchar("webhook_secret", { length: 255 }),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("telegram_channels_user_connected_at_idx").on(table.userId, table.connectedAt)],
);

export const telegramChannelsRelations = relations(telegramChannels, ({ one, many }) => ({
  user: one(users, {
    fields: [telegramChannels.userId],
    references: [users.id],
  }),
  posts: many(telegramPosts),
  profile: one(channelProfiles, {
    fields: [telegramChannels.id],
    references: [channelProfiles.channelId],
  }),
  welcomeMessages: many(welcomeMessages),
}));
