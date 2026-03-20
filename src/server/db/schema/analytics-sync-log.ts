import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { platformEnum } from "./platform-connections";

export const analyticsSyncLog = pgTable(
  "analytics_sync_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: platformEnum().notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    syncWindowStart: timestamp("sync_window_start", {
      withTimezone: true,
    }).notNull(),
    syncWindowEnd: timestamp("sync_window_end", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    index("analytics_sync_log_user_platform_window_idx").on(
      table.userId,
      table.platform,
      table.syncWindowStart,
      table.syncWindowEnd,
    ),
  ],
);

export const analyticsSyncLogRelations = relations(analyticsSyncLog, ({ one }) => ({
  user: one(users, {
    fields: [analyticsSyncLog.userId],
    references: [users.id],
  }),
}));
