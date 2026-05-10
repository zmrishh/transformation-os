-- ============================================================
-- Transformation OS — Extend programme to 100 days
-- Run in Supabase SQL Editor.
-- Safe to re-run. NO data is deleted or modified.
-- ============================================================

-- Widen the day-range check on every table that had <= 90.
-- Existing rows (day 1–90) are fully preserved.

-- daily_logs
alter table public.daily_logs
  drop constraint if exists daily_logs_day_check;
alter table public.daily_logs
  add constraint daily_logs_day_check check (day >= 1 and day <= 100);

-- media_entries
alter table public.media_entries
  drop constraint if exists media_entries_day_check;
alter table public.media_entries
  add constraint media_entries_day_check check (day >= 1 and day <= 100);

-- journal_entries
alter table public.journal_entries
  drop constraint if exists journal_entries_day_number_check;
alter table public.journal_entries
  add constraint journal_entries_day_number_check
    check (day_number >= 1 and day_number <= 100);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
