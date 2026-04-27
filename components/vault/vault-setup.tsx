"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"

const SUPABASE_PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_SQL_EDITOR = SUPABASE_PROJECT_URL
  ? `${SUPABASE_PROJECT_URL.replace("supabase.co", "supabase.com/dashboard/project")
      .replace("https://", "https://supabase.com/dashboard/project/")
      .replace("supabase.com/dashboard/project/https://", "https://")
    }/sql/new`
  : "https://supabase.com/dashboard"

// Derive the project reference from the URL
const PROJECT_REF = SUPABASE_PROJECT_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ""
const SQL_EDITOR_URL = PROJECT_REF
  ? `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`
  : "https://supabase.com/dashboard"

const SETUP_SQL = `-- Transformation OS — Vault setup
-- Run once in the Supabase SQL Editor
-- Also enable: Authentication → Providers → Anonymous Sign-ins → ON

-- 1. media_entries table
create table if not exists public.media_entries (
  id           uuid default gen_random_uuid() primary key,
  user_id      text not null,
  day          integer not null check (day >= 1 and day <= 90),
  filename     text not null,
  storage_path text not null,
  url          text not null,
  created_at   timestamptz default now() not null
);

alter table public.media_entries
  add column if not exists user_id text;

create index if not exists media_entries_user_day_idx
  on public.media_entries (user_id, day desc, created_at desc);

-- 2. Row Level Security (owner-only)
alter table public.media_entries enable row level security;

drop policy if exists "anon_select"   on public.media_entries;
drop policy if exists "anon_insert"   on public.media_entries;
drop policy if exists "anon_delete"   on public.media_entries;
drop policy if exists "owner_select"  on public.media_entries;
drop policy if exists "owner_insert"  on public.media_entries;
drop policy if exists "owner_delete"  on public.media_entries;

create policy "owner_select" on public.media_entries
  for select using (auth.uid()::text = user_id);
create policy "owner_insert" on public.media_entries
  for insert with check (auth.uid()::text = user_id);
create policy "owner_delete" on public.media_entries
  for delete using (auth.uid()::text = user_id);

-- 3. Storage bucket (PRIVATE — access via signed URLs only)
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do update set public = false;

-- 4. Storage object policies (user-scoped paths: {userId}/{day}/{file})
drop policy if exists "anon_upload"         on storage.objects;
drop policy if exists "anon_delete_objects" on storage.objects;
drop policy if exists "anon_read_objects"   on storage.objects;
drop policy if exists "owner_upload"        on storage.objects;
drop policy if exists "owner_read"          on storage.objects;
drop policy if exists "owner_delete"        on storage.objects;

create policy "owner_upload" on storage.objects
  for insert with check (
    bucket_id = 'vault'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_read" on storage.objects
  for select using (
    bucket_id = 'vault'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner_delete" on storage.objects
  for delete using (
    bucket_id = 'vault'
    and auth.uid()::text = (storage.foldername(name))[1]);`

export function VaultSetup() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(SETUP_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Vault needs a one-time setup</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The Supabase table and storage bucket don&apos;t exist yet. Copy the SQL below
          and run it in your Supabase SQL Editor — takes about 10 seconds.
        </p>
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-3">
        {[
          {
            step: "1",
            text: "Copy the SQL below",
            action: (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
                style={{
                  background: copied ? "var(--success-muted)" : "var(--secondary)",
                  color: copied ? "var(--success)" : "var(--foreground)",
                }}
              >
                {copied ? (
                  <><CheckIcon className="size-3" /> Copied</>
                ) : (
                  <><CopyIcon className="size-3" /> Copy SQL</>
                )}
              </button>
            ),
          },
          {
            step: "2",
            text: "Open the Supabase SQL Editor",
            action: (
              <a
                href={SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                }}
              >
                <ExternalLinkIcon className="size-3" />
                Open Editor
              </a>
            ),
          },
          {
            step: "3",
            text: "Paste and click Run — then reload this page",
          },
        ].map(({ step, text, action }) => (
          <li key={step} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="size-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                {step}
              </span>
              <span className="text-xs text-muted-foreground">{text}</span>
            </div>
            {action}
          </li>
        ))}
      </ol>

      {/* SQL preview */}
      <div
        className="rounded-xl overflow-hidden border border-border"
        style={{ background: "var(--secondary)" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
            SQL
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-[11px] leading-relaxed text-muted-foreground overflow-x-auto p-4 font-mono">
          {SETUP_SQL}
        </pre>
      </div>
    </div>
  )
}
