-- Schedules now support two target modes:
-- - cross_post (uses cross_post_id)
-- - telegram_publish (uses content_library_id + channel_id)
-- The legacy schema kept cross_post_id as NOT NULL, which breaks telegram_publish inserts.
ALTER TABLE "public"."schedules"
  ALTER COLUMN "cross_post_id" DROP NOT NULL;
