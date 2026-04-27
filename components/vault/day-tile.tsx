"use client"

import { BookOpenIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MediaRow } from "@/lib/supabase"

interface DayTileProps {
  day:        number
  mediaItems: MediaRow[]
  hasJournal: boolean
  isToday:    boolean
  onClick:    () => void
}

export function DayTile({ day, mediaItems, hasJournal, isToday, onClick }: DayTileProps) {
  const firstMedia = mediaItems[0] ?? null
  const isVideo    = firstMedia?.filename.match(/\.(mp4|mov)$/i)

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-2xl overflow-hidden group",
        "transition-all duration-200 active:scale-[0.96] hover:brightness-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
      )}
    >
      {/* ── Background ── */}
      {firstMedia ? (
        isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={firstMedia.url}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstMedia.url}
            alt={`Day ${day}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--secondary)" }}
        >
          {isToday && (
            <span className="text-3xl font-extralight text-foreground/20 select-none">+</span>
          )}
        </div>
      )}

      {/* ── Gradient overlay (only when there's media) ── */}
      {firstMedia && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      )}

      {/* ── Day label — bottom-left ── */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
        <p className={cn(
          "text-xs font-semibold leading-tight",
          firstMedia ? "text-white/90" : "text-foreground/60"
        )}>
          Day {day}
        </p>
        {isToday && (
          <p className={cn(
            "text-[10px]",
            firstMedia ? "text-white/55" : "text-muted-foreground/60"
          )}>
            Today
          </p>
        )}
      </div>

      {/* ── Media count badge — top-left ── */}
      {mediaItems.length > 1 && (
        <div className="absolute top-2 left-2 bg-black/35 backdrop-blur-sm rounded-full px-1.5 py-0.5">
          <span className="text-[10px] font-medium text-white/80">{mediaItems.length}</span>
        </div>
      )}

      {/* ── Journal indicator — top-right ── */}
      {hasJournal && (
        <div className="absolute top-2 right-2 size-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <BookOpenIcon className="size-2.5 text-white/70" />
        </div>
      )}
    </button>
  )
}
