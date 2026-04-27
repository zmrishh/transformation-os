import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
  )
}

/**
 * Row type for public.media_entries.
 * Explicit casts are used at call sites because we use createClient<any>
 * to avoid Supabase's fragile generic overloads.
 */
export interface MediaRow {
  id: string
  user_id: string
  day: number
  filename: string
  storage_path: string
  url: string              // signed URL, regenerated on every fetch
  created_at: string
}

export type MediaInsert = Omit<MediaRow, "id" | "created_at">

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(url, key)

export const VAULT_BUCKET = "vault" as const

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current user's Supabase auth UUID.
 *
 * Priority:
 *  1. Existing session (handles page refresh, tab re-open)
 *  2. Anonymous sign-in  (first visit, requires Anonymous Auth enabled in Supabase)
 *  3. Device UUID fallback (if anonymous auth is not enabled in the project)
 *
 * To enable Anonymous Auth:
 *   Supabase Dashboard → Authentication → Providers → Anonymous Sign-ins → Enable
 */
export async function ensureAuth(): Promise<string> {
  // 1. Reuse existing session
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user.id

  // 2. Anonymous sign-in
  const { data, error } = await supabase.auth.signInAnonymously()
  if (!error && data.user) return data.user.id

  // 3. Fallback: stable device UUID stored in localStorage
  //    This activates if anonymous auth is disabled in the project.
  //    RLS policies that depend on auth.uid() will NOT apply in this case.
  const { getUserId } = await import("./user-id")
  const fallbackId = getUserId()
  console.warn(
    "[auth] Anonymous sign-in failed — using device UUID fallback.",
    "Enable Anonymous Sign-ins in the Supabase Dashboard for full RLS support.",
    error?.message
  )
  return fallbackId
}
