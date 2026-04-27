-- ============================================================
-- Transformation OS — Vault (media)
-- Safe to re-run (all statements are idempotent).
-- Run AFTER enabling Anonymous Sign-ins in Supabase Dashboard:
--   Authentication → Providers → Anonymous Sign-ins → Enable
-- ============================================================

-- 1. media_entries table
create table if not exists public.media_entries (
  id           uuid        default gen_random_uuid() primary key,
  user_id      text        not null,
  day          integer     not null check (day >= 1 and day <= 90),
  filename     text        not null,
  storage_path text        not null,
  url          text        not null,
  created_at   timestamptz default now() not null
);

-- Add user_id to existing installations that pre-date this column
alter table public.media_entries
  add column if not exists user_id text;

create index if not exists media_entries_user_day_idx
  on public.media_entries (user_id, day desc, created_at desc);

-- 2. Row Level Security — owner-only access
alter table public.media_entries enable row level security;

drop policy if exists "anon_select"    on public.media_entries;
drop policy if exists "anon_insert"    on public.media_entries;
drop policy if exists "anon_delete"    on public.media_entries;
drop policy if exists "owner_select"   on public.media_entries;
drop policy if exists "owner_insert"   on public.media_entries;
drop policy if exists "owner_delete"   on public.media_entries;

create policy "owner_select" on public.media_entries
  for select using (auth.uid()::text = user_id);

create policy "owner_insert" on public.media_entries
  for insert with check (auth.uid()::text = user_id);

create policy "owner_delete" on public.media_entries
  for delete using (auth.uid()::text = user_id);

-- 3. Storage bucket — PRIVATE (signed URLs only)
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do update set public = false;

-- 4. Storage object RLS — files live at {user_id}/{day}/{filename}
--    First folder segment must equal the authenticated user's UUID.
drop policy if exists "anon_upload"          on storage.objects;
drop policy if exists "anon_delete_objects"  on storage.objects;
drop policy if exists "anon_read_objects"    on storage.objects;
drop policy if exists "owner_upload"         on storage.objects;
drop policy if exists "owner_read"           on storage.objects;
drop policy if exists "owner_delete"         on storage.objects;

create policy "owner_upload" on storage.objects
  for insert with check (
    bucket_id = 'vault'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "owner_read" on storage.objects
  for select using (
    bucket_id = 'vault'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "owner_delete" on storage.objects
  for delete using (
    bucket_id = 'vault'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
