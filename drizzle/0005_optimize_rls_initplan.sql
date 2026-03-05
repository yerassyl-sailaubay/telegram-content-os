-- Optimize RLS policy expressions for planner initplan caching:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

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
    execute format(
      'alter policy auth_manage_own_rows on public.%I using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      tbl
    );
  end loop;
end
$$;
--> statement-breakpoint

alter policy auth_manage_own_profile
  on public.users
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
--> statement-breakpoint

alter policy auth_manage_own_channel_metrics
  on public.channel_metrics
  using (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = channel_metrics.channel_id
        and tc.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = channel_metrics.channel_id
        and tc.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint

alter policy auth_manage_own_channel_profiles
  on public.channel_profiles
  using (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = channel_profiles.channel_id
        and tc.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = channel_profiles.channel_id
        and tc.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint

alter policy auth_manage_own_telegram_posts
  on public.telegram_posts
  using (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = telegram_posts.channel_id
        and tc.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = telegram_posts.channel_id
        and tc.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint

alter policy auth_manage_own_welcome_messages
  on public.welcome_messages
  using (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = welcome_messages.channel_id
        and tc.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.telegram_channels tc
      where tc.id = welcome_messages.channel_id
        and tc.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint

alter policy auth_manage_own_post_analytics
  on public.post_analytics
  using (
    exists (
      select 1
      from public.cross_posts cp
      where cp.id = post_analytics.cross_post_id
        and cp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.cross_posts cp
      where cp.id = post_analytics.cross_post_id
        and cp.user_id = (select auth.uid())
    )
  );
