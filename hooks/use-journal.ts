"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchJournalEntries,
  upsertJournalEntry,
  deleteJournalEntry,
  type JournalEntry,
} from "@/lib/journal"

export interface UseJournalReturn {
  entries:  JournalEntry[]
  loading:  boolean
  /** Upsert an entry; updates local state optimistically. */
  save:     (day: number, content: string) => Promise<void>
  /** Remove entry for day; removes from local state immediately. */
  remove:   (day: number) => Promise<void>
  reload:   () => Promise<void>
  /** Quick lookup by day number. */
  byDay:    Record<number, JournalEntry>
}

export function useJournal(): UseJournalReturn {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchJournalEntries()
    if (mounted.current) {
      setEntries(data)
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (day: number, content: string): Promise<void> => {
    // Optimistic update first
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.day_number === day)
      const now  = new Date().toISOString()
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], content, updated_at: now }
        return next
      }
      const placeholder: JournalEntry = {
        id: `temp-${day}`, user_id: "", day_number: day, content, created_at: now, updated_at: now,
      }
      return [placeholder, ...prev].sort((a, b) => b.day_number - a.day_number)
    })

    const saved = await upsertJournalEntry(day, content)
    if (saved && mounted.current) {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.day_number === day)
        if (idx >= 0) {
          const next = [...prev]; next[idx] = saved; return next
        }
        return [saved, ...prev].sort((a, b) => b.day_number - a.day_number)
      })
    }
  }, [])

  const remove = useCallback(async (day: number): Promise<void> => {
    setEntries((prev) => prev.filter((e) => e.day_number !== day))
    await deleteJournalEntry(day)
  }, [])

  const byDay = entries.reduce<Record<number, JournalEntry>>((acc, e) => {
    acc[e.day_number] = e
    return acc
  }, {})

  return { entries, loading, save, remove, reload: load, byDay }
}
