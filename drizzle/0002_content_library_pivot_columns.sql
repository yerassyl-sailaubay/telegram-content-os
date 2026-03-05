DO $$
BEGIN
  CREATE TYPE "public"."content_source_type" AS ENUM(
    'telegram_import',
    'idea',
    'repurposed',
    'external_source',
    'ai_generated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."content_status" AS ENUM(
    'draft',
    'published',
    'archived',
    'scheduled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint
ALTER TYPE "public"."content_source_type" ADD VALUE IF NOT EXISTS 'telegram_import';--> statement-breakpoint
ALTER TYPE "public"."content_source_type" ADD VALUE IF NOT EXISTS 'idea';--> statement-breakpoint
ALTER TYPE "public"."content_source_type" ADD VALUE IF NOT EXISTS 'repurposed';--> statement-breakpoint
ALTER TYPE "public"."content_source_type" ADD VALUE IF NOT EXISTS 'external_source';--> statement-breakpoint
ALTER TYPE "public"."content_source_type" ADD VALUE IF NOT EXISTS 'ai_generated';--> statement-breakpoint
ALTER TYPE "public"."content_status" ADD VALUE IF NOT EXISTS 'draft';--> statement-breakpoint
ALTER TYPE "public"."content_status" ADD VALUE IF NOT EXISTS 'published';--> statement-breakpoint
ALTER TYPE "public"."content_status" ADD VALUE IF NOT EXISTS 'archived';--> statement-breakpoint
ALTER TYPE "public"."content_status" ADD VALUE IF NOT EXISTS 'scheduled';--> statement-breakpoint
ALTER TABLE "public"."content_library" ADD COLUMN IF NOT EXISTS "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."content_library" ADD COLUMN IF NOT EXISTS "source_type" "public"."content_source_type";--> statement-breakpoint
ALTER TABLE "public"."content_library" ADD COLUMN IF NOT EXISTS "status" "public"."content_status" DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "public"."content_library" ADD COLUMN IF NOT EXISTS "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."content_library" ADD COLUMN IF NOT EXISTS "source_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "public"."content_library" ADD COLUMN IF NOT EXISTS "source_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "public"."content_library" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
UPDATE "public"."content_library" SET "status" = 'draft' WHERE "status" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'content_library_channel_id_telegram_channels_id_fk'
  ) THEN
    ALTER TABLE "public"."content_library"
      ADD CONSTRAINT "content_library_channel_id_telegram_channels_id_fk"
      FOREIGN KEY ("channel_id")
      REFERENCES "public"."telegram_channels"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_user_created_at_idx" ON "public"."content_library" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_user_status_created_at_idx" ON "public"."content_library" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_user_category_idx" ON "public"."content_library" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_channel_id_idx" ON "public"."content_library" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_parent_id_idx" ON "public"."content_library" USING btree ("parent_id");
