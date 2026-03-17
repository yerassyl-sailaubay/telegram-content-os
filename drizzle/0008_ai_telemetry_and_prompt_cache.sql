create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid() not null,
  user_id uuid not null references public.users(id) on delete cascade,
  channel_id uuid references public.telegram_channels(id) on delete set null,
  content_id uuid references public.content_library(id) on delete set null,
  feature varchar(64) not null,
  model_id varchar(255) not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  input_cost_usd double precision not null default 0,
  output_cost_usd double precision not null default 0,
  total_cost_usd double precision not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
--> statement-breakpoint

create index if not exists ai_usage_events_user_created_at_idx
  on public.ai_usage_events (user_id, created_at);
--> statement-breakpoint

create index if not exists ai_usage_events_feature_created_at_idx
  on public.ai_usage_events (feature, created_at);
--> statement-breakpoint

create index if not exists ai_usage_events_channel_created_at_idx
  on public.ai_usage_events (channel_id, created_at);
--> statement-breakpoint

create table if not exists public.ai_prompt_cache (
  id uuid primary key default gen_random_uuid() not null,
  user_id uuid not null references public.users(id) on delete cascade,
  feature varchar(64) not null,
  cache_key varchar(128) not null,
  model_id varchar(255),
  response jsonb not null,
  expires_at timestamp with time zone not null,
  hit_count integer not null default 0,
  last_hit_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_prompt_cache_user_feature_key_unique'
      and conrelid = 'public.ai_prompt_cache'::regclass
  ) then
    alter table public.ai_prompt_cache
      add constraint ai_prompt_cache_user_feature_key_unique
      unique (user_id, feature, cache_key);
  end if;
end $$;
--> statement-breakpoint

create index if not exists ai_prompt_cache_feature_expires_idx
  on public.ai_prompt_cache (feature, expires_at);
--> statement-breakpoint

create index if not exists ai_prompt_cache_user_last_hit_idx
  on public.ai_prompt_cache (user_id, last_hit_at);
--> statement-breakpoint

do $$
begin
  alter table public.ai_usage_events enable row level security;
exception
  when undefined_table then null;
end $$;
--> statement-breakpoint

do $$
begin
  alter table public.ai_prompt_cache enable row level security;
exception
  when undefined_table then null;
end $$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage_events'
      and policyname = 'auth_manage_own_rows'
  ) then
    create policy auth_manage_own_rows
      on public.ai_usage_events
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_prompt_cache'
      and policyname = 'auth_manage_own_rows'
  ) then
    create policy auth_manage_own_rows
      on public.ai_prompt_cache
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
