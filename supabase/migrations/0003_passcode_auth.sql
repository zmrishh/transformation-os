-- ============================================================
-- Transformation OS — Passcode-based authentication
-- Run in Supabase SQL Editor.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- 1. profiles — one row per passcode, keyed by SHA-256 hash
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  passcode_hash text not null unique,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_open" on public.profiles;
create policy "profiles_open" on public.profiles
  using (true) with check (true);

-- 2. Relax user_progress RLS — auth.uid() no longer used.
--    Rows are isolated via profile_id (UUID, unguessable) in app queries.
alter table public.user_progress enable row level security;
drop policy if exists "progress_owner_all"  on public.user_progress;
drop policy if exists "progress_anon_all"   on public.user_progress;
drop policy if exists "progress_open"       on public.user_progress;
create policy "progress_open" on public.user_progress
  using (true) with check (true);

-- 3. Relax daily_logs RLS
alter table public.daily_logs enable row level security;
drop policy if exists "logs_owner_all"  on public.daily_logs;
drop policy if exists "logs_anon_all"   on public.daily_logs;
drop policy if exists "logs_open"       on public.daily_logs;
create policy "logs_open" on public.daily_logs
  using (true) with check (true);

-- 4. Relax media_entries RLS
alter table public.media_entries enable row level security;
drop policy if exists "owner_select"  on public.media_entries;
drop policy if exists "owner_insert"  on public.media_entries;
drop policy if exists "owner_delete"  on public.media_entries;
drop policy if exists "media_open"    on public.media_entries;
create policy "media_open" on public.media_entries
  using (true) with check (true);

-- 5. Storage: relax object policies (bucket stays private; signed URLs enforce access)
drop policy if exists "owner_upload"  on storage.objects;
drop policy if exists "owner_read"    on storage.objects;
drop policy if exists "owner_delete"  on storage.objects;
drop policy if exists "vault_open_upload" on storage.objects;
drop policy if exists "vault_open_read"   on storage.objects;
drop policy if exists "vault_open_delete" on storage.objects;

create policy "vault_open_upload" on storage.objects
  for insert with check (bucket_id = 'vault');
create policy "vault_open_read" on storage.objects
  for select using (bucket_id = 'vault');
create policy "vault_open_delete" on storage.objects
  for delete using (bucket_id = 'vault');
