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
