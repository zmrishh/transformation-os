const UID_KEY = "transformation-os-uid"

/**
 * Returns the stable anonymous user ID for this browser.
 * Creates and persists a new UUID on first call.
 * Returns empty string in SSR context (window is not available).
 */
export function getUserId(): string {
  if (typeof window === "undefined") return ""

  const stored = localStorage.getItem(UID_KEY)
  if (stored) return stored

  const fresh = crypto.randomUUID()
  localStorage.setItem(UID_KEY, fresh)
  return fresh
}
