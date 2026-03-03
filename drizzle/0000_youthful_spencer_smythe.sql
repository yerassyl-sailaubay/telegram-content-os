CREATE TYPE "public"."adaptation_tone" AS ENUM('professional', 'casual', 'match-original');--> statement-breakpoint
CREATE TYPE "public"."ai_model" AS ENUM('gpt-4o-mini', 'claude-haiku', 'auto');--> statement-breakpoint
CREATE TYPE "public"."cross_post_status" AS ENUM('draft', 'scheduled', 'posted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'plus', 'pro');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('linkedin', 'twitter');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TABLE "analytics_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_window_start" timestamp with time zone NOT NULL,
	"sync_window_end" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"date" date NOT NULL,
	"total_posts" integer DEFAULT 0 NOT NULL,
	"total_engagement" integer DEFAULT 0 NOT NULL,
	"follower_count_snapshot" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"niche" varchar(255),
	"tone" varchar(255),
	"top_topics" jsonb DEFAULT '[]'::jsonb,
	"language" varchar(10) DEFAULT 'ru',
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "channel_profiles_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "content_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"content" text,
	"category" varchar(255),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_template" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cross_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_post_id" uuid,
	"platform" "platform" NOT NULL,
	"adapted_content" text,
	"original_language" varchar(10) DEFAULT 'ru',
	"target_language" varchar(10) DEFAULT 'en',
	"ai_model_used" varchar(255),
	"platform_post_id" varchar(255),
	"status" "cross_post_status" DEFAULT 'draft',
	"scheduled_for" timestamp with time zone,
	"posted_at" timestamp with time zone,
	"engagement_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_path" varchar(1024) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(255),
	"size_bytes" integer,
	"thumbnail_url" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"platform_user_id" varchar(255),
	"platform_username" varchar(255),
	"connected_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cross_post_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"impressions" integer,
	"likes" integer,
	"comments" integer,
	"shares" integer,
	"clicks" integer,
	"character_count" integer,
	"has_media" boolean,
	"fetched_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recurring_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid,
	"frequency" "recurring_frequency" NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"time_utc" varchar(5) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"platforms" text[] NOT NULL,
	"content_template_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cross_post_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC',
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" varchar(255),
	"status" "schedule_status" DEFAULT 'pending',
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"plan" "plan" DEFAULT 'free',
	"status" "subscription_status" DEFAULT 'active',
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"telegram_chat_id" varchar(255) NOT NULL,
	"title" varchar(255),
	"username" varchar(255),
	"description" text,
	"member_count" integer DEFAULT 0,
	"bot_token_encrypted" text,
	"webhook_secret" varchar(255),
	"connected_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "telegram_channels_telegram_chat_id_unique" UNIQUE("telegram_chat_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"telegram_message_id" integer,
	"content_raw" text,
	"content_parsed" jsonb,
	"media_urls" jsonb DEFAULT '[]'::jsonb,
	"views" integer DEFAULT 0,
	"forwards" integer DEFAULT 0,
	"reactions" jsonb DEFAULT '{}'::jsonb,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"cross_posts_count" integer DEFAULT 0,
	"ai_calls_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usage_tracking_user_month_unique" UNIQUE("user_id","month")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC',
	"language" varchar(10) DEFAULT 'en',
	"ai_model" "ai_model" DEFAULT 'auto',
	"adaptation_tone" "adaptation_tone" DEFAULT 'professional',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar_url" varchar(1024),
	"locale" varchar(10) DEFAULT 'ru',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "welcome_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"content" text NOT NULL,
	"language" varchar(10) DEFAULT 'ru',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "welcome_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"template_text" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "analytics_sync_log" ADD CONSTRAINT "analytics_sync_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_metrics" ADD CONSTRAINT "channel_metrics_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_profiles" ADD CONSTRAINT "channel_profiles_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_library" ADD CONSTRAINT "content_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_posts" ADD CONSTRAINT "cross_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_posts" ADD CONSTRAINT "cross_posts_source_post_id_telegram_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."telegram_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_cross_post_id_cross_posts_id_fk" FOREIGN KEY ("cross_post_id") REFERENCES "public"."cross_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_cross_post_id_cross_posts_id_fk" FOREIGN KEY ("cross_post_id") REFERENCES "public"."cross_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_channels" ADD CONSTRAINT "telegram_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_messages" ADD CONSTRAINT "welcome_messages_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_templates" ADD CONSTRAINT "welcome_templates_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_templates" ADD CONSTRAINT "welcome_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;