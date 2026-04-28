import { supabase } from "./supabase"

const PROFILE_ID_KEY = "transformation-os-profile-id"

// ─── Passcode hashing ─────────────────────────────────────────────────────────

/**
 * Deterministic SHA-256 hash of a passcode using the Web Crypto API.
 * Same passcode on any device → same 64-char hex digest → same profile row.
 * The plain passcode is never stored, transmitted, or logged.
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
 * Hashes the passcode client-side → calls the `login_with_passcode` Postgres
 * function (SECURITY DEFINER) which atomically upserts the profiles row and
 * returns the UUID.
 *
 * The `profiles` table has NO direct-access RLS policy — the only way to
 * touch it is through this function, preventing hash enumeration attacks.
 *
 * Same passcode on any device → same SHA-256 hash → same profile UUID.
 */
export async function loginWithPasscode(passcode: string): Promise<string> {
  const trimmed = passcode.trim()
  if (trimmed.length < 4) throw new Error("Passcode must be at least 4 characters")

  const hash = await hashPasscode(trimmed)

  // Call the SECURITY DEFINER function — avoids direct table exposure.
  const { data: profileId, error } = await supabase
    .rpc("login_with_passcode", { p_hash: hash })

  if (error) throw new Error(error.message)
  if (!profileId) throw new Error("Login failed: no profile ID returned")

  storeProfileId(profileId as string)
  return profileId as string
}
