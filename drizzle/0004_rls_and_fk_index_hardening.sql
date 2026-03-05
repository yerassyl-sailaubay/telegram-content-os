-- Security + performance hardening:
-- - enables RLS across public app tables
-- - adds owner-scoped policies for authenticated users
-- - adds dedupe + unique constraints for safer upserts
-- - adds covering indexes for foreign keys flagged by Supabase advisors

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
--> statement-breakpoint

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
--> statement-breakpoint

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
--> statement-breakpoint

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
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2) RLS + policies
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'users',
    'analytics_sync_log',
    'channel_metrics',
    'channel_profiles',
    'content_library',
    'cross_posts',
    'external_sources',
    'media_files',
    'platform_connections',
    'post_analytics',
    'recurring_schedules',
    'schedules',
    'subscriptions',
    'telegram_channels',
    'telegram_posts',
    'usage_tracking',
    'user_preferences',
    'welcome_messages',
    'welcome_templates'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end
$$;
--> statement-breakpoint

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'analytics_sync_log',
    'content_library',
    'cross_posts',
    'external_sources',
    'media_files',
    'platform_connections',
    'recurring_schedules',
    'schedules',
    'subscriptions',
    'telegram_channels',
    'usage_tracking',
    'user_preferences',
    'welcome_templates'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'auth_manage_own_rows'
    ) then
      execute format(
        'create policy auth_manage_own_rows on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
        tbl
      );
    end if;
  end loop;
end
$$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'auth_manage_own_profile'
  ) then
    create policy auth_manage_own_profile
      on public.users
      for all
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end
$$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'channel_metrics'
      and policyname = 'auth_manage_own_channel_metrics'
  ) then
    create policy auth_manage_own_channel_metrics
      on public.channel_metrics
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = channel_metrics.channel_id
            and tc.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = channel_metrics.channel_id
            and tc.user_id = auth.uid()
        )
      );
  end if;
end
$$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'channel_profiles'
      and policyname = 'auth_manage_own_channel_profiles'
  ) then
    create policy auth_manage_own_channel_profiles
      on public.channel_profiles
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = channel_profiles.channel_id
            and tc.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = channel_profiles.channel_id
            and tc.user_id = auth.uid()
        )
      );
  end if;
end
$$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_posts'
      and policyname = 'auth_manage_own_telegram_posts'
  ) then
    create policy auth_manage_own_telegram_posts
      on public.telegram_posts
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = telegram_posts.channel_id
            and tc.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = telegram_posts.channel_id
            and tc.user_id = auth.uid()
        )
      );
  end if;
end
$$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'welcome_messages'
      and policyname = 'auth_manage_own_welcome_messages'
  ) then
    create policy auth_manage_own_welcome_messages
      on public.welcome_messages
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = welcome_messages.channel_id
            and tc.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.telegram_channels tc
          where tc.id = welcome_messages.channel_id
            and tc.user_id = auth.uid()
        )
      );
  end if;
end
$$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_analytics'
      and policyname = 'auth_manage_own_post_analytics'
  ) then
    create policy auth_manage_own_post_analytics
      on public.post_analytics
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.cross_posts cp
          where cp.id = post_analytics.cross_post_id
            and cp.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.cross_posts cp
          where cp.id = post_analytics.cross_post_id
            and cp.user_id = auth.uid()
        )
      );
  end if;
end
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3) Foreign-key covering indexes (advisor-driven)
-- ---------------------------------------------------------------------------

create index if not exists analytics_sync_log_user_id_idx
  on public.analytics_sync_log (user_id);
--> statement-breakpoint

create index if not exists channel_metrics_channel_id_idx
  on public.channel_metrics (channel_id);
--> statement-breakpoint

create index if not exists cross_posts_source_post_id_idx
  on public.cross_posts (source_post_id);
--> statement-breakpoint

create index if not exists cross_posts_user_id_idx
  on public.cross_posts (user_id);
--> statement-breakpoint

create index if not exists media_files_user_id_idx
  on public.media_files (user_id);
--> statement-breakpoint

create index if not exists platform_connections_user_id_idx
  on public.platform_connections (user_id);
--> statement-breakpoint

create index if not exists post_analytics_cross_post_id_idx
  on public.post_analytics (cross_post_id);
--> statement-breakpoint

create index if not exists recurring_schedules_channel_id_idx
  on public.recurring_schedules (channel_id);
--> statement-breakpoint

create index if not exists recurring_schedules_user_id_idx
  on public.recurring_schedules (user_id);
--> statement-breakpoint

create index if not exists schedules_cross_post_id_idx
  on public.schedules (cross_post_id);
--> statement-breakpoint

create index if not exists schedules_user_id_idx
  on public.schedules (user_id);
--> statement-breakpoint

create index if not exists telegram_channels_user_id_idx
  on public.telegram_channels (user_id);
--> statement-breakpoint

create index if not exists telegram_posts_channel_id_idx
  on public.telegram_posts (channel_id);
--> statement-breakpoint

create index if not exists welcome_messages_channel_id_idx
  on public.welcome_messages (channel_id);
--> statement-breakpoint

create index if not exists welcome_templates_channel_id_idx
  on public.welcome_templates (channel_id);
--> statement-breakpoint

create index if not exists welcome_templates_user_id_idx
  on public.welcome_templates (user_id);
