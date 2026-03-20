-- Create/update the shared media storage bucket used by:
-- - src/server/actions/media.ts
-- - src/server/actions/telegram-post.ts
--
-- Why this migration exists:
-- The app expects a `media` bucket, but previous migrations did not create it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_objects_select_own'
  ) then
    create policy media_objects_select_own
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'media'
        and (
          (storage.foldername(name))[1] = (select auth.uid()::text)
          or (
            (storage.foldername(name))[1] = 'telegram-posts'
            and (storage.foldername(name))[2] = (select auth.uid()::text)
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_objects_insert_own'
  ) then
    create policy media_objects_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'media'
        and (
          (storage.foldername(name))[1] = (select auth.uid()::text)
          or (
            (storage.foldername(name))[1] = 'telegram-posts'
            and (storage.foldername(name))[2] = (select auth.uid()::text)
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_objects_update_own'
  ) then
    create policy media_objects_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'media'
        and (
          (storage.foldername(name))[1] = (select auth.uid()::text)
          or (
            (storage.foldername(name))[1] = 'telegram-posts'
            and (storage.foldername(name))[2] = (select auth.uid()::text)
          )
        )
      )
      with check (
        bucket_id = 'media'
        and (
          (storage.foldername(name))[1] = (select auth.uid()::text)
          or (
            (storage.foldername(name))[1] = 'telegram-posts'
            and (storage.foldername(name))[2] = (select auth.uid()::text)
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_objects_delete_own'
  ) then
    create policy media_objects_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'media'
        and (
          (storage.foldername(name))[1] = (select auth.uid()::text)
          or (
            (storage.foldername(name))[1] = 'telegram-posts'
            and (storage.foldername(name))[2] = (select auth.uid()::text)
          )
        )
      );
  end if;
end
$$;
