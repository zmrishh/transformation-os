import { supabase } from "./supabase"

const PROFILE_ID_KEY = "transformation-os-profile-id"

// ─── Passcode hashing ─────────────────────────────────────────────────────────

/**
 * Deterministic SHA-256 hash of a passcode using the Web Crypto API.
 * Same passcode on any device → same hex digest → same profile row.
 * The plain passcode is never stored or transmitted.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const data       = new TextEncoder().encode(passcode.trim())
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Returns the stored profile UUID or null if not authenticated. */
export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(PROFILE_ID_KEY)
}

/** Persist profile UUID to localStorage so the user stays logged in. */
export function storeProfileId(id: string): void {
  localStorage.setItem(PROFILE_ID_KEY, id)
}

/** Remove session (logout). */
export function clearProfileId(): void {
  localStorage.removeItem(PROFILE_ID_KEY)
}

// ─── Core login ───────────────────────────────────────────────────────────────

/**
 * Log in with a passcode.
 *
 * Hashes the passcode → looks up `profiles.passcode_hash`.
 * - Found  → stores profile_id in localStorage → returns it
 * - Not found → creates a new profiles row → returns new profile_id
 *
 * This is the ONLY place a profile row is ever created, so the same
 * passcode always maps to the same data across all devices.
 */
export async function loginWithPasscode(passcode: string): Promise<string> {
  const trimmed = passcode.trim()
  if (trimmed.length < 4) throw new Error("Passcode must be at least 4 characters")

  const hash = await hashPasscode(trimmed)

  // Try to find an existing profile
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("passcode_hash", hash)
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)

  if (existing?.id) {
    storeProfileId(existing.id)
    return existing.id
  }

  // First use of this passcode — create a new profile
  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({ passcode_hash: hash })
    .select("id")
    .single()

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create profile")
  }

  storeProfileId(created.id)
  return created.id
}
