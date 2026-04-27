"use client"

import { BookOpenIcon, ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { dayToDate } from "@/lib/progress"
import type { JournalEntry } from "@/lib/journal"

interface JournalTimelineProps {
  entries:    JournalEntry[]
  loading:    boolean
  startDate:  string | null
  currentDay: number
  onOpenDay:  (day: number) => void
}

const PREVIEW_LENGTH = 130

function formatEntryDate(startDate: string | null, dayNumber: number): string {
  if (!startDate) return `Day ${dayNumber}`
  try {
    const iso  = dayToDate(startDate, dayNumber)
    const date = new Date(iso)
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  } catch {
    return `Day ${dayNumber}`
  }
}

function relativeLabel(startDate: string | null, dayNumber: number, currentDay: number): string {
  if (dayNumber === currentDay) return "Today"
  if (dayNumber === currentDay - 1) return "Yesterday"
  const diff = currentDay - dayNumber
  return `${diff} days ago`
}

function EntryCard({
  entry,
  startDate,
  currentDay,
  onOpen,
}: {
  entry:      JournalEntry
  startDate:  string | null
  currentDay: number
  onOpen:     () => void
}) {
  const preview  = entry.content.trim().slice(0, PREVIEW_LENGTH)
  const clipped  = entry.content.trim().length > PREVIEW_LENGTH
  const dateStr  = formatEntryDate(startDate, entry.day_number)
  const relative = relativeLabel(startDate, entry.day_number, currentDay)

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group text-left w-full flex flex-col gap-2 py-4",
        "border-b border-border last:border-0",
        "transition-all duration-150 active:scale-[0.99]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="size-3 text-muted-foreground/40" />
          <span className="text-xs font-semibold text-foreground/70">Day {entry.day_number}</span>
          <span className="text-xs text-muted-foreground/50">{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[10px] text-muted-foreground/50">{relative}</span>
          <ArrowRightIcon className="size-3 text-muted-foreground/40" />
        </div>
      </div>

      {/* Content preview */}
      <p className="text-sm leading-relaxed text-foreground/75 text-left">
        {preview}
        {clipped && <span className="text-muted-foreground/40">…</span>}
      </p>
    </button>
  )
}

export function JournalTimeline({
  entries,
  loading,
  startDate,
  currentDay,
  onOpenDay,
}: JournalTimelineProps) {
  // Exclude today (shown as the editor above)
  const pastEntries = entries.filter((e) => e.day_number !== currentDay)

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-4 border-b border-border last:border-0">
            <div className="h-3 rounded-full bg-secondary w-28 mb-3" />
            <div className="h-3 rounded-full bg-secondary w-full mb-2" />
            <div className="h-3 rounded-full bg-secondary w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (pastEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/50 py-6 text-center">
        Past entries will appear here.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {pastEntries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          startDate={startDate}
          currentDay={currentDay}
          onOpen={() => onOpenDay(entry.day_number)}
        />
      ))}
    </div>
  )
}
