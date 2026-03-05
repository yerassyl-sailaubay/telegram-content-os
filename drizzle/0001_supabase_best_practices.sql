-- Supabase/Postgres best-practice hardening:
-- - prevent duplicate platform connections
-- - make channel metrics writes safely upsertable
-- - add high-impact indexes for hot query paths

-- ---------------------------------------------------------------------------
-- 1) Data cleanup + constraints for atomic upserts
-- ---------------------------------------------------------------------------

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, platform
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.platform_connections
)
delete from public.platform_connections pc
using ranked
where pc.id = ranked.id and ranked.rn > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_connections_user_platform_unique'
      and conrelid = 'public.platform_connections'::regclass
  ) then
    alter table public.platform_connections
      add constraint platform_connections_user_platform_unique
      unique (user_id, platform);
  end if;
end $$;

with ranked as (
  select
    id,
    row_number() over (
      partition by channel_id, platform, date
      order by created_at desc nulls last, id desc
    ) as rn
  from public.channel_metrics
)
delete from public.channel_metrics cm
using ranked
where cm.id = ranked.id and ranked.rn > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'channel_metrics_channel_platform_date_unique'
      and conrelid = 'public.channel_metrics'::regclass
  ) then
    alter table public.channel_metrics
      add constraint channel_metrics_channel_platform_date_unique
      unique (channel_id, platform, date);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Query/index performance
-- ---------------------------------------------------------------------------

create index if not exists platform_connections_user_id_idx
  on public.platform_connections (user_id);

create index if not exists telegram_channels_user_connected_at_idx
  on public.telegram_channels (user_id, connected_at);

create index if not exists telegram_posts_channel_posted_at_idx
  on public.telegram_posts (channel_id, posted_at);

create index if not exists telegram_posts_channel_message_id_idx
  on public.telegram_posts (channel_id, telegram_message_id);

create index if not exists schedules_user_status_scheduled_at_idx
  on public.schedules (user_id, status, scheduled_at);

create index if not exists schedules_recurrence_scheduled_at_idx
  on public.schedules (recurrence_rule, scheduled_at);

create index if not exists schedules_cross_post_id_idx
  on public.schedules (cross_post_id);

create index if not exists schedules_content_library_id_idx
  on public.schedules (content_library_id);

create index if not exists schedules_channel_id_idx
  on public.schedules (channel_id);

create index if not exists cross_posts_user_created_at_idx
  on public.cross_posts (user_id, created_at);

create index if not exists cross_posts_user_status_idx
  on public.cross_posts (user_id, status);

create index if not exists cross_posts_source_post_id_idx
  on public.cross_posts (source_post_id);

create index if not exists cross_posts_platform_post_id_idx
  on public.cross_posts (platform_post_id);

create index if not exists channel_metrics_channel_date_idx
  on public.channel_metrics (channel_id, date);

create index if not exists analytics_sync_log_user_platform_window_idx
  on public.analytics_sync_log (user_id, platform, sync_window_start, sync_window_end);

create index if not exists recurring_schedules_active_next_run_idx
  on public.recurring_schedules (is_active, next_run_at);

create index if not exists recurring_schedules_user_id_idx
  on public.recurring_schedules (user_id);

create index if not exists recurring_schedules_channel_id_idx
  on public.recurring_schedules (channel_id);

create index if not exists content_library_user_created_at_idx
  on public.content_library (user_id, created_at);

create index if not exists content_library_user_status_created_at_idx
  on public.content_library (user_id, status, created_at);

create index if not exists content_library_user_category_idx
  on public.content_library (user_id, category);

create index if not exists content_library_channel_id_idx
  on public.content_library (channel_id);

create index if not exists content_library_parent_id_idx
  on public.content_library (parent_id);

create index if not exists content_library_tags_gin_idx
  on public.content_library using gin (tags jsonb_path_ops);

create index if not exists content_library_search_fts_idx
  on public.content_library
  using gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  );
