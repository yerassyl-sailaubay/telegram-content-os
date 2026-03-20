-- Add onboarding_progress column to user_preferences table
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "onboarding_progress" jsonb;