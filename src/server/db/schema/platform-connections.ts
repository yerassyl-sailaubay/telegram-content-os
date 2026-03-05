import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const platformEnum = pgEnum("platform", ["linkedin", "twitter"]);

export const platformConnections = pgTable(
  "platform_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: platformEnum().notNull(),
    accessTokenEncrypted: text("access_token_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    platformUserId: varchar("platform_user_id", { length: 255 }),
    platformUsername: varchar("platform_username", { length: 255 }),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("platform_connections_user_platform_unique").on(table.userId, table.platform),
    index("platform_connections_user_id_idx").on(table.userId),
  ],
);

export const platformConnectionsRelations = relations(
  platformConnections,
  ({ one }) => ({
    user: one(users, {
      fields: [platformConnections.userId],
      references: [users.id],
    }),
  }),
);
