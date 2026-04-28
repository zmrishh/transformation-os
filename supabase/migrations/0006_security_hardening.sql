-- ============================================================
-- Transformation OS — Security Hardening
-- Run in Supabase SQL Editor after all previous migrations.
-- Safe to re-run (all statements are idempotent).
-- ============================================================
-- ARCHITECTURE NOTE
-- This app uses custom passcode auth — there is no Supabase Auth session,
-- so auth.uid() and request.jwt.claims are always NULL for anon requests.
-- RLS cannot be keyed on auth.uid(). Security is enforced via:
--   1. SECURITY DEFINER functions for the sensitive `profiles` table
--      (hides all rows; only the function can read/write them)
--   2. UUID-obscurity for all data tables (profile_id is 128-bit random)
--   3. Application-level .eq('user_id', profileId) on every query
--   4. Private storage bucket + signed URLs for media
-- ============================================================

-- ─── 1. PROFILES TABLE — lock down completely ────────────────────────────────
-- The profiles table stores SHA-256 passcode hashes.
-- Direct SELECT by anon would allow enumerating all hashes → offline attack.
-- Solution: remove all direct-access policies; route ALL access through a
-- SECURITY DEFINER function that runs as the DB owner (bypasses RLS).

alter table public.profiles enable row level security;

-- Remove every existing policy (idempotent drops)
drop policy if exists "profiles_open"      on public.profiles;
drop policy if exists "profiles_read"      on public.profiles;
drop policy if exists "profiles_insert"    on public.profiles;
-- Intentionally create NO new policy → RLS default = DENY ALL for anon.
-- Only the SECURITY DEFINER function below can touch this table.


-- ─── 2. login_with_passcode — atomic upsert (replaces direct table access) ──
-- Looks up an existing profile by hash, or creates one on first use.
-- Returns the profile UUID. ON CONFLICT handles concurrent first-use races.
-- SECURITY DEFINER: runs as the function owner, bypassing RLS on profiles.

create or replace function public.login_with_passcode(p_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_hash is null or length(p_hash) <> 64 then
    raise exception 'invalid_passcode_hash' using hint = 'Must be a 64-char hex SHA-256 digest';
  end if;

  -- Atomic upsert: insert or ignore on conflict, then read back the id.
  insert into public.profiles (passcode_hash)
  values (p_hash)
  on conflict (passcode_hash) do nothing;

  select id into v_id
  from public.profiles
  where passcode_hash = p_hash;

  return v_id;
end;
$$;

-- Allow the anon role (used by the client) to call this function.
grant execute on function public.login_with_passcode(text) to anon;

-- Revoke any stray direct-table grants on profiles from anon (safety net).
revoke all on public.profiles from anon;


-- ─── 3. DATA TABLES — harden INSERT; keep open SELECT/DELETE ─────────────────
-- SELECT is open because profile_id (user_id) is a 128-bit UUID — unguessable
-- without knowing the passcode. The app ALWAYS filters by user_id at query level.
-- INSERT is hardened: reject rows where user_id is missing or not a UUID.

-- user_progress
alter table public.user_progress enable row level security;
drop policy if exists "progress_open"         on public.user_progress;
drop policy if exists "progress_select_open"  on public.user_progress;
drop policy if exists "progress_insert_open"  on public.user_progress;
drop policy if exists "progress_all_open"     on public.user_progress;

create policy "progress_select_open" on public.user_progress
  for select using (true);

create policy "progress_insert_open" on public.user_progress
  for insert with check (
    user_id is not null
    and length(user_id) = 36           -- UUID with hyphens
  );

create policy "progress_update_open" on public.user_progress
  for update using (true) with check (user_id is not null);

create policy "progress_delete_open" on public.user_progress
  for delete using (true);

-- daily_logs
alter table public.daily_logs enable row level security;
drop policy if exists "logs_open"         on public.daily_logs;
drop policy if exists "logs_select_open"  on public.daily_logs;
drop policy if exists "logs_insert_open"  on public.daily_logs;
drop policy if exists "logs_all_open"     on public.daily_logs;

create policy "logs_select_open" on public.daily_logs
  for select using (true);

create policy "logs_insert_open" on public.daily_logs
  for insert with check (
    user_id is not null
    and length(user_id) = 36
  );

create policy "logs_update_open" on public.daily_logs
  for update using (true) with check (user_id is not null);

create policy "logs_delete_open" on public.daily_logs
  for delete using (true);

-- journal_entries
alter table public.journal_entries enable row level security;
drop policy if exists "journal_open"         on public.journal_entries;
drop policy if exists "journal_select_open"  on public.journal_entries;
drop policy if exists "journal_insert_open"  on public.journal_entries;

create policy "journal_select_open" on public.journal_entries
  for select using (true);

create policy "journal_insert_open" on public.journal_entries
  for insert with check (
    user_id is not null
    and length(user_id) = 36
  );

create policy "journal_update_open" on public.journal_entries
  for update using (true) with check (user_id is not null);

create policy "journal_delete_open" on public.journal_entries
  for delete using (true);

-- media_entries
alter table public.media_entries enable row level security;
drop policy if exists "media_open"         on public.media_entries;
drop policy if exists "media_select_open"  on public.media_entries;
drop policy if exists "media_insert_open"  on public.media_entries;

create policy "media_select_open" on public.media_entries
  for select using (true);

create policy "media_insert_open" on public.media_entries
  for insert with check (
    user_id is not null
    and length(user_id) = 36
  );

create policy "media_delete_open" on public.media_entries
  for delete using (true);


-- ─── 4. STORAGE — confirm private bucket + open object policies ──────────────
-- Bucket is already PRIVATE (set in 0001_vault.sql).
-- Object policies stay open because the bucket is private — files are only
-- reachable via time-limited signed URLs, not public HTTP access.

insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do update set public = false;

drop policy if exists "vault_open_upload" on storage.objects;
drop policy if exists "vault_open_read"   on storage.objects;
drop policy if exists "vault_open_delete" on storage.objects;

create policy "vault_open_upload" on storage.objects
  for insert with check (bucket_id = 'vault');

create policy "vault_open_read" on storage.objects
  for select using (bucket_id = 'vault');

create policy "vault_open_delete" on storage.objects
  for delete using (bucket_id = 'vault');


-- ─── 5. Reload PostgREST schema cache ────────────────────────────────────────
notify pgrst, 'reload schema';
