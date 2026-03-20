import { pgTable, uuid, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { crossPosts } from "./cross-posts";
import { platformEnum } from "./platform-connections";

export const postAnalytics = pgTable("post_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  crossPostId: uuid("cross_post_id")
    .references(() => crossPosts.id, { onDelete: "cascade" })
    .notNull(),
  platform: platformEnum().notNull(),
  impressions: integer("impressions"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  clicks: integer("clicks"),
  characterCount: integer("character_count"),
  hasMedia: boolean("has_media"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
});

export const postAnalyticsRelations = relations(postAnalytics, ({ one }) => ({
  crossPost: one(crossPosts, {
    fields: [postAnalytics.crossPostId],
    references: [crossPosts.id],
  }),
}));
