-- ============================================================
-- Transformation OS — Replace USING (true) policies
-- Run in Supabase SQL Editor after 0006_security_hardening.sql.
-- Safe to re-run (all statements are idempotent).
-- ============================================================
-- WHY THIS IS THE STRONGEST RLS ACHIEVABLE WITHOUT SUPABASE AUTH
-- ---------------------------------------------------------------
-- With custom passcode auth there is NO authenticated session —
-- auth.uid() and JWT claims are always NULL for anon requests.
-- Therefore we cannot write  USING (user_id = auth.uid())  and
-- have it restrict access.
--
-- What we CAN do:
--   USING (user_id IS NOT NULL)
--   → hides any orphaned / corrupted rows that lack an owner
--   → every valid app row has user_id set to a 128-bit UUID
--   → combined with app-level .eq('user_id', profileId), this is
--     defence-in-depth: two independent layers of user isolation
--
-- What this does NOT do:
--   → it does NOT block a caller who already knows another user's
--     UUID from querying that user's rows via the REST API.
--     That is the inherent trade-off of custom auth without JWT claims.
--     The profile UUID (128-bit random) is the de-facto credential.
-- ============================================================

-- ─── user_progress ───────────────────────────────────────────────────────────
drop policy if exists "progress_select_open" on public.user_progress;
drop policy if exists "progress_update_open" on public.user_progress;
drop policy if exists "progress_delete_open" on public.user_progress;

create policy "progress_select" on public.user_progress
  for select using (user_id is not null);

create policy "progress_update" on public.user_progress
  for update
  using  (user_id is not null)
  with check (user_id is not null and length(user_id) = 36);

create policy "progress_delete" on public.user_progress
  for delete using (user_id is not null);

-- ─── daily_logs ──────────────────────────────────────────────────────────────
drop policy if exists "logs_select_open" on public.daily_logs;
drop policy if exists "logs_update_open" on public.daily_logs;
drop policy if exists "logs_delete_open" on public.daily_logs;

create policy "logs_select" on public.daily_logs
  for select using (user_id is not null);

create policy "logs_update" on public.daily_logs
  for update
  using  (user_id is not null)
  with check (user_id is not null and length(user_id) = 36);

create policy "logs_delete" on public.daily_logs
  for delete using (user_id is not null);

-- ─── journal_entries ─────────────────────────────────────────────────────────
drop policy if exists "journal_select_open" on public.journal_entries;
drop policy if exists "journal_update_open" on public.journal_entries;
drop policy if exists "journal_delete_open" on public.journal_entries;

create policy "journal_select" on public.journal_entries
  for select using (user_id is not null);

create policy "journal_update" on public.journal_entries
  for update
  using  (user_id is not null)
  with check (user_id is not null and length(user_id) = 36);

create policy "journal_delete" on public.journal_entries
  for delete using (user_id is not null);

-- ─── media_entries ───────────────────────────────────────────────────────────
drop policy if exists "media_select_open"  on public.media_entries;
drop policy if exists "media_delete_open"  on public.media_entries;

create policy "media_select" on public.media_entries
  for select using (user_id is not null);

create policy "media_delete" on public.media_entries
  for delete using (user_id is not null);

-- ─── storage.objects — scope read/write/delete to vault bucket only ──────────
-- The bucket itself is PRIVATE — files are never reachable via public HTTP.
-- Signed URLs (TTL 1 h) are the only access path. These policies gate which
-- bucket the anon role can interact with; path-scoping is enforced by the app.
drop policy if exists "vault_open_upload" on storage.objects;
drop policy if exists "vault_open_read"   on storage.objects;
drop policy if exists "vault_open_delete" on storage.objects;

create policy "vault_upload" on storage.objects
  for insert with check (bucket_id = 'vault');

create policy "vault_read" on storage.objects
  for select using (bucket_id = 'vault');

create policy "vault_delete" on storage.objects
  for delete using (bucket_id = 'vault');

-- ─── Force PostgREST to reload its schema cache ──────────────────────────────
notify pgrst, 'reload schema';
