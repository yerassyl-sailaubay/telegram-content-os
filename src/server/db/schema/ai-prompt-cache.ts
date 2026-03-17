import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const aiPromptCache = pgTable(
  "ai_prompt_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    feature: varchar("feature", { length: 64 }).notNull(),
    cacheKey: varchar("cache_key", { length: 128 }).notNull(),
    modelId: varchar("model_id", { length: 255 }),
    response: jsonb("response").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    hitCount: integer("hit_count").notNull().default(0),
    lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("ai_prompt_cache_user_feature_key_unique").on(
      table.userId,
      table.feature,
      table.cacheKey,
    ),
    index("ai_prompt_cache_feature_expires_idx").on(table.feature, table.expiresAt),
    index("ai_prompt_cache_user_last_hit_idx").on(table.userId, table.lastHitAt),
  ],
);

export const aiPromptCacheRelations = relations(aiPromptCache, ({ one }) => ({
  user: one(users, {
    fields: [aiPromptCache.userId],
    references: [users.id],
  }),
}));
