"use client"

import { useCallback, useMemo, useState } from "react"
import { Nav } from "@/components/nav"
import { DropZone } from "@/components/vault/drop-zone"
import { DayTile } from "@/components/vault/day-tile"
import { DayDetailModal } from "@/components/vault/day-detail-modal"
import { PhotoStrip } from "@/components/vault/photo-strip"
import { useMedia } from "@/hooks/use-media"
import { useJournal } from "@/hooks/use-journal"
import { useStore } from "@/lib/store"
import type { MediaRow } from "@/lib/supabase"
import type { UploadError } from "@/lib/media"

export function VaultClient() {
  const currentDay = useStore((s) => s.currentDay)
  const startDate  = useStore((s) => s.startDate)
  const entries    = useStore((s) => s.entries)

  const { items, loading, uploading, fetchError, fetchErrorKind, upload, remove } = useMedia()
  const { byDay: journalByDay, save: saveJournal } = useJournal()

  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const setupRequired = fetchErrorKind === "setup_required"

  // Group media items by day number
  const mediaByDay = useMemo<Record<number, MediaRow[]>>(() => {
    const map: Record<number, MediaRow[]> = {}
    for (const item of items) {
      if (!map[item.day]) map[item.day] = []
      map[item.day].push(item)
    }
    return map
  }, [items])

  // All days that have media OR journal content, plus today
  const activeDays = useMemo<number[]>(() => {
    const daySet = new Set<number>([
      ...Object.keys(mediaByDay).map(Number),
      ...Object.keys(journalByDay).map(Number),
      currentDay,
    ])
    return Array.from(daySet).sort((a, b) => b - a)
  }, [mediaByDay, journalByDay, currentDay])

  // Upload wrapper scoped to the selected day
  const handleUploadForDay = useCallback(
    async (file: File): Promise<UploadError | null> => {
      if (selectedDay === null) return null
      return upload(file, selectedDay)
    },
    [upload, selectedDay]
  )

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-lg px-4 sm:px-6 pt-20 sm:pt-24 pb-24 flex flex-col gap-10">

        {/* ── Header ── */}
        <div className="flex flex-col gap-1 pt-4">
          <h1 className="text-3xl font-bold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground">
            Your transformation archive.
          </p>
        </div>

        {/* ── Today's upload ── */}
        {!setupRequired && (
          <div className="section-reveal flex flex-col gap-2" style={{ animationDelay: "0ms" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Today · Day {currentDay}
            </p>
            <DropZone day={currentDay} uploading={uploading} onUpload={upload} />
          </div>
        )}

        {/* ── Day library grid / setup guide ── */}
        <div
          className="section-reveal flex flex-col gap-4"
          style={{ animationDelay: "80ms" }}
        >
          {setupRequired ? (
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Setup required
              </p>
              <PhotoStrip
                items={[]}
                loading={false}
                fetchError={fetchError}
                fetchErrorKind={fetchErrorKind}
                onDelete={remove}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Archive</p>

              {!loading && activeDays.length === 1 && !mediaByDay[currentDay] && !journalByDay[currentDay] ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No entries yet. Upload your first photo above.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {activeDays.map((day) => (
                    <DayTile
                      key={day}
                      day={day}
                      mediaItems={mediaByDay[day] ?? []}
                      hasJournal={!!journalByDay[day]}
                      isToday={day === currentDay}
                      onClick={() => setSelectedDay(day)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </main>

      {/* ── Day detail modal ── */}
      {selectedDay !== null && (
        <DayDetailModal
          day={selectedDay}
          isOpen
          onClose={() => setSelectedDay(null)}
          mediaItems={mediaByDay[selectedDay] ?? []}
          workoutEntry={entries[selectedDay]}
          startDate={startDate}
          journalEntry={journalByDay[selectedDay] ?? null}
          onSaveJournal={saveJournal}
          onUpload={handleUploadForDay}
          onDeleteMedia={remove}
          uploading={uploading}
        />
      )}
    </div>
  )
}
