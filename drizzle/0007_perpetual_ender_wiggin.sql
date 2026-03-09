create table if not exists public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid() not null,
  user_id uuid not null references public.users(id) on delete cascade,
  token varchar(128) not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'telegram_link_tokens_token_unique'
      and conrelid = 'public.telegram_link_tokens'::regclass
  ) then
    alter table public.telegram_link_tokens
      add constraint telegram_link_tokens_token_unique
      unique (token);
  end if;
end $$;
--> statement-breakpoint

create index if not exists telegram_link_tokens_user_id_idx
  on public.telegram_link_tokens (user_id);
--> statement-breakpoint

alter table public.users
  add column if not exists telegram_user_id varchar(64);
--> statement-breakpoint

alter table public.users
  add column if not exists telegram_linked_at timestamp with time zone;
--> statement-breakpoint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_telegram_user_id_unique'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_telegram_user_id_unique
      unique (telegram_user_id);
  end if;
end $$;
--> statement-breakpoint

do $$
begin
  alter table public.telegram_link_tokens enable row level security;
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
      and tablename = 'telegram_link_tokens'
      and policyname = 'auth_manage_own_rows'
  ) then
    create policy auth_manage_own_rows
      on public.telegram_link_tokens
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
