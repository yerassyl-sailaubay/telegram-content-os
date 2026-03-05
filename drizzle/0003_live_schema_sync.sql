-- Live schema sync for Supabase:
-- - align ai_model enum with current app values
-- - add content library pivot columns/enums
-- - add schedule target/content/channel columns
-- - add external_sources table used by source ingestion flows

ALTER TYPE "public"."ai_model" ADD VALUE IF NOT EXISTS 'gemini-flash';--> statement-breakpoint
ALTER TYPE "public"."ai_model" ADD VALUE IF NOT EXISTS 'gemini-pro';--> statement-breakpoint

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
      AND conrelid = 'public.content_library'::regclass
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
CREATE INDEX IF NOT EXISTS "content_library_parent_id_idx" ON "public"."content_library" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_tags_gin_idx" ON "public"."content_library" USING gin ("tags" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_library_search_fts_idx" ON "public"."content_library"
  USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("content", '')));--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "public"."schedule_target_type" AS ENUM(
    'cross_post',
    'telegram_publish'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

ALTER TYPE "public"."schedule_target_type" ADD VALUE IF NOT EXISTS 'cross_post';--> statement-breakpoint
ALTER TYPE "public"."schedule_target_type" ADD VALUE IF NOT EXISTS 'telegram_publish';--> statement-breakpoint

ALTER TABLE "public"."schedules" ADD COLUMN IF NOT EXISTS "content_library_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."schedules" ADD COLUMN IF NOT EXISTS "target_type" "public"."schedule_target_type" DEFAULT 'cross_post';--> statement-breakpoint
ALTER TABLE "public"."schedules" ADD COLUMN IF NOT EXISTS "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."schedules" ALTER COLUMN "target_type" SET DEFAULT 'cross_post';--> statement-breakpoint
UPDATE "public"."schedules" SET "target_type" = 'cross_post' WHERE "target_type" IS NULL;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_content_library_id_content_library_id_fk'
      AND conrelid = 'public.schedules'::regclass
  ) THEN
    ALTER TABLE "public"."schedules"
      ADD CONSTRAINT "schedules_content_library_id_content_library_id_fk"
      FOREIGN KEY ("content_library_id")
      REFERENCES "public"."content_library"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_channel_id_telegram_channels_id_fk'
      AND conrelid = 'public.schedules'::regclass
  ) THEN
    ALTER TABLE "public"."schedules"
      ADD CONSTRAINT "schedules_channel_id_telegram_channels_id_fk"
      FOREIGN KEY ("channel_id")
      REFERENCES "public"."telegram_channels"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "schedules_content_library_id_idx" ON "public"."schedules" USING btree ("content_library_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedules_channel_id_idx" ON "public"."schedules" USING btree ("channel_id");--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "public"."external_source_type" AS ENUM(
    'youtube',
    'article',
    'podcast'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "public"."source_processing_status" AS ENUM(
    'pending',
    'extracting',
    'extracted',
    'generating',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

ALTER TYPE "public"."external_source_type" ADD VALUE IF NOT EXISTS 'youtube';--> statement-breakpoint
ALTER TYPE "public"."external_source_type" ADD VALUE IF NOT EXISTS 'article';--> statement-breakpoint
ALTER TYPE "public"."external_source_type" ADD VALUE IF NOT EXISTS 'podcast';--> statement-breakpoint
ALTER TYPE "public"."source_processing_status" ADD VALUE IF NOT EXISTS 'pending';--> statement-breakpoint
ALTER TYPE "public"."source_processing_status" ADD VALUE IF NOT EXISTS 'extracting';--> statement-breakpoint
ALTER TYPE "public"."source_processing_status" ADD VALUE IF NOT EXISTS 'extracted';--> statement-breakpoint
ALTER TYPE "public"."source_processing_status" ADD VALUE IF NOT EXISTS 'generating';--> statement-breakpoint
ALTER TYPE "public"."source_processing_status" ADD VALUE IF NOT EXISTS 'completed';--> statement-breakpoint
ALTER TYPE "public"."source_processing_status" ADD VALUE IF NOT EXISTS 'failed';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "public"."external_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "source_url" varchar(2048) NOT NULL,
  "source_type" "public"."external_source_type" NOT NULL,
  "title" varchar(500),
  "extracted_text" text,
  "extracted_metadata" jsonb,
  "processing_status" "public"."source_processing_status" DEFAULT 'pending',
  "error_message" text,
  "linked_draft_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_sources_user_id_users_id_fk'
      AND conrelid = 'public.external_sources'::regclass
  ) THEN
    ALTER TABLE "public"."external_sources"
      ADD CONSTRAINT "external_sources_user_id_users_id_fk"
      FOREIGN KEY ("user_id")
      REFERENCES "public"."users"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_sources_linked_draft_id_content_library_id_fk'
      AND conrelid = 'public.external_sources'::regclass
  ) THEN
    ALTER TABLE "public"."external_sources"
      ADD CONSTRAINT "external_sources_linked_draft_id_content_library_id_fk"
      FOREIGN KEY ("linked_draft_id")
      REFERENCES "public"."content_library"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "external_sources_user_id_idx" ON "public"."external_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_sources_processing_status_idx" ON "public"."external_sources" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_sources_linked_draft_id_idx" ON "public"."external_sources" USING btree ("linked_draft_id");
