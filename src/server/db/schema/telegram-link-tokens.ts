import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const telegramLinkTokens = pgTable(
  "telegram_link_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: varchar("token", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("telegram_link_tokens_user_id_idx").on(table.userId)],
);

export const telegramLinkTokensRelations = relations(telegramLinkTokens, ({ one }) => ({
  user: one(users, {
    fields: [telegramLinkTokens.userId],
    references: [users.id],
  }),
}));
