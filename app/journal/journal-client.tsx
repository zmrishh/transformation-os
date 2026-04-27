"use client"

import { useCallback, useMemo, useState } from "react"
import { Nav } from "@/components/nav"
import { JournalEditor } from "@/components/journal/journal-editor"
import { JournalTimeline } from "@/components/journal/journal-timeline"
import { DayDetailModal } from "@/components/vault/day-detail-modal"
import { useJournal } from "@/hooks/use-journal"
import { useMedia } from "@/hooks/use-media"
import { useStore } from "@/lib/store"
import type { MediaRow } from "@/lib/supabase"
import type { UploadError } from "@/lib/media"

export function JournalClient() {
  const currentDay = useStore((s) => s.currentDay)
  const startDate  = useStore((s) => s.startDate)
  const entries    = useStore((s) => s.entries)

  const { entries: journalEntries, loading, save, byDay } = useJournal()
  const { items: mediaItems, uploading, upload, remove }  = useMedia()

  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Media grouped by day (for the day detail modal)
  const mediaByDay = useMemo<Record<number, MediaRow[]>>(() => {
    const map: Record<number, MediaRow[]> = {}
    for (const item of mediaItems) {
      if (!map[item.day]) map[item.day] = []
      map[item.day].push(item)
    }
    return map
  }, [mediaItems])

  const handleUploadForDay = useCallback(
    async (file: File): Promise<UploadError | null> => {
      if (selectedDay === null) return null
      return upload(file, selectedDay)
    },
    [upload, selectedDay]
  )

  const todayEntry = byDay[currentDay] ?? null

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-lg px-4 sm:px-6 pt-20 sm:pt-24 pb-24 flex flex-col gap-12">

        {/* ── Header ── */}
        <div className="flex flex-col gap-1 pt-4">
          <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
          <p className="text-sm text-muted-foreground">
            One honest note per day.
          </p>
        </div>

        {/* ── Today's entry ── */}
        <div className="section-reveal flex flex-col gap-3" style={{ animationDelay: "0ms" }}>
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
            <span className="text-xs text-muted-foreground/40">Day {currentDay}</span>
          </div>
          <JournalEditor
            day={currentDay}
            initialEntry={todayEntry}
            onSave={save}
          />
        </div>

        {/* ── Past entries ── */}
        <div className="section-reveal flex flex-col gap-4" style={{ animationDelay: "80ms" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Past Entries</p>
          <JournalTimeline
            entries={journalEntries}
            loading={loading}
            startDate={startDate}
            currentDay={currentDay}
            onOpenDay={(day) => setSelectedDay(day)}
          />
        </div>

      </main>

      {/* ── Day detail modal (opens when a past entry is clicked) ── */}
      {selectedDay !== null && (
        <DayDetailModal
          day={selectedDay}
          isOpen
          onClose={() => setSelectedDay(null)}
          mediaItems={mediaByDay[selectedDay] ?? []}
          workoutEntry={entries[selectedDay]}
          startDate={startDate}
          journalEntry={byDay[selectedDay] ?? null}
          onSaveJournal={save}
          onUpload={handleUploadForDay}
          onDeleteMedia={remove}
          uploading={uploading}
        />
      )}
    </div>
  )
}
