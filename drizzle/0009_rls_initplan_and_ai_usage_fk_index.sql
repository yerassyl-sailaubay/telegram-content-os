-- Performance hardening:
-- - add missing covering index for ai_usage_events.content_id foreign key
-- - optimize RLS policies to use initplan-cached auth.uid() lookups

create index if not exists ai_usage_events_content_id_idx
  on public.ai_usage_events (content_id);
--> statement-breakpoint

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage_events'
      and policyname = 'auth_manage_own_rows'
  ) then
    alter policy auth_manage_own_rows
      on public.ai_usage_events
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;
--> statement-breakpoint

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_prompt_cache'
      and policyname = 'auth_manage_own_rows'
  ) then
    alter policy auth_manage_own_rows
      on public.ai_prompt_cache
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;
--> statement-breakpoint

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_link_tokens'
      and policyname = 'auth_manage_own_rows'
  ) then
    alter policy auth_manage_own_rows
      on public.telegram_link_tokens
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;
