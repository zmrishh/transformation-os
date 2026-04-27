-- ============================================================
-- Transformation OS — Fix media_entries schema cache issue
-- Run this in the Supabase SQL Editor if uploads fail with
-- "Could not find the 'user_id' column … in the schema cache"
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- 1. Guarantee user_id column exists (NOT NULL with a default so existing
--    rows aren't broken; existing rows with null will be set to 'unknown').
alter table public.media_entries
  add column if not exists user_id text not null default 'unknown';

-- Remove the temporary default immediately — future inserts must supply it.
alter table public.media_entries
  alter column user_id drop default;

-- 2. Index for fast per-user lookups (idempotent).
create index if not exists media_entries_user_day_idx
  on public.media_entries (user_id, day desc, created_at desc);

-- 3. Re-apply open RLS policies so insert/select/delete work without auth.uid().
alter table public.media_entries enable row level security;

drop policy if exists "anon_select"  on public.media_entries;
drop policy if exists "anon_insert"  on public.media_entries;
drop policy if exists "anon_delete"  on public.media_entries;
drop policy if exists "owner_select" on public.media_entries;
drop policy if exists "owner_insert" on public.media_entries;
drop policy if exists "owner_delete" on public.media_entries;
drop policy if exists "media_open"   on public.media_entries;

create policy "media_open" on public.media_entries
  using (true) with check (true);

-- 4. Force PostgREST to reload its schema cache immediately.
--    This is the key fix for the "column not found in schema cache" error.
notify pgrst, 'reload schema';
