-- ============================================================
-- Transformation OS — Journal + Workout Type
-- Run in Supabase SQL Editor after 0003_passcode_auth.sql.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- 1. Add workout_type column to daily_logs
--    Values: 'both' | 'muscle' | 'cardio' (nullable for existing rows)
alter table public.daily_logs
  add column if not exists workout_type text
  check (workout_type in ('both', 'muscle', 'cardio'));

-- 2. Create journal_entries table — one entry per (user, day)
create table if not exists public.journal_entries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  day_number  integer     not null check (day_number >= 1 and day_number <= 90),
  content     text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day_number)
);

alter table public.journal_entries enable row level security;

drop policy if exists "journal_open" on public.journal_entries;
create policy "journal_open" on public.journal_entries
  using (true) with check (true);
