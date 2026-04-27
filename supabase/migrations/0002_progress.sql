-- ============================================================
-- Transformation OS — User progress + daily logs
-- Safe to re-run (all statements are idempotent).
-- Run AFTER enabling Anonymous Sign-ins in Supabase Dashboard:
--   Authentication → Providers → Anonymous Sign-ins → Enable
-- ============================================================

-- 1. user_progress — one row per user
create table if not exists public.user_progress (
  user_id         text         primary key,
  start_date      date         not null,
  start_weight    numeric(5,1) not null,
  goal_weight     numeric(5,1) not null default 75,
  height_cm       numeric(5,1),
  age_years       integer,
  sex             text         check (sex in ('M', 'F')),
  calorie_target  integer      not null default 2100,
  protein_target  integer      not null default 160,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "progress_anon_all"   on public.user_progress;
drop policy if exists "progress_owner_all"  on public.user_progress;

-- Owner-only: auth.uid() must match the user_id column
create policy "progress_owner_all" on public.user_progress
  using      (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- 2. daily_logs — one row per (user, day)
create table if not exists public.daily_logs (
  id            uuid         primary key default gen_random_uuid(),
  user_id       text         not null references public.user_progress(user_id) on delete cascade,
  day           integer      not null check (day >= 1 and day <= 90),
  log_date      date         not null,
  workout_done  boolean      not null default false,
  calories      integer,
  protein       integer,
  weight        numeric(5,1),
  completed     boolean      not null default false,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  unique (user_id, day)
);

create index if not exists daily_logs_user_day_idx
  on public.daily_logs (user_id, day desc);

alter table public.daily_logs enable row level security;

drop policy if exists "logs_anon_all"    on public.daily_logs;
drop policy if exists "logs_owner_all"   on public.daily_logs;

create policy "logs_owner_all" on public.daily_logs
  using      (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
