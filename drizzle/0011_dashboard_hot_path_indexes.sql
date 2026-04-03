create index if not exists content_library_user_updated_created_at_idx
  on public.content_library (user_id, updated_at, created_at);
--> statement-breakpoint

create index if not exists schedules_user_target_status_scheduled_at_idx
  on public.schedules (user_id, target_type, status, scheduled_at);
--> statement-breakpoint

create index if not exists schedules_user_target_status_updated_at_idx
  on public.schedules (user_id, target_type, status, updated_at);
