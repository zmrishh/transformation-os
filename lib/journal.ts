import { supabase } from "./supabase"
import { getStoredProfileId } from "./auth"

export interface JournalEntry {
  id:         string
  user_id:    string
  day_number: number
  content:    string
  created_at: string
  updated_at: string
}

/**
 * Fetch all journal entries for the current user, newest day first.
 * Silently returns [] if the table doesn't exist yet (migration not run).
 */
export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const userId = getStoredProfileId()
  if (!userId) return []

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("day_number", { ascending: false })

  if (error) {
    // Table may not exist — warn but don't crash
    console.warn("[journal] fetchJournalEntries:", error.message)
    return []
  }

  return (data ?? []) as JournalEntry[]
}

/**
 * Create or update a journal entry for a given day.
 * Empty content is valid — the entry is preserved so the day stays visible.
 */
export async function upsertJournalEntry(
  dayNumber: number,
  content: string
): Promise<JournalEntry | null> {
  const userId = getStoredProfileId()
  if (!userId) return null

  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(
      {
        user_id:    userId,
        day_number: dayNumber,
        content:    content.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_number" }
    )
    .select()
    .single()

  if (error) {
    console.error("[journal] upsertJournalEntry:", error.message)
    return null
  }

  return data as JournalEntry
}

/**
 * Permanently remove a journal entry for a given day.
 * Used when the user clears the content entirely.
 */
export async function deleteJournalEntry(dayNumber: number): Promise<void> {
  const userId = getStoredProfileId()
  if (!userId) return

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("day_number", dayNumber)

  if (error) {
    console.error("[journal] deleteJournalEntry:", error.message)
  }
}
