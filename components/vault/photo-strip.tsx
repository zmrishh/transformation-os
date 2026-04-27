"use client"

import { useState } from "react"
import { PlayIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { MediaRow } from "@/lib/supabase"
import type { UploadError } from "@/lib/media"
import type { FetchErrorKind } from "@/hooks/use-media"
import { PhotoModal } from "./photo-modal"
import { VaultSetup } from "./vault-setup"
import { cn } from "@/lib/utils"

const isVideo = (filename: string) => /\.(mp4|mov|webm|avi)$/i.test(filename)

interface PhotoStripProps {
  items: MediaRow[]
  loading: boolean
  fetchError: string | null
  fetchErrorKind: FetchErrorKind
  onDelete: (entry: MediaRow) => Promise<UploadError | null>
}

interface ThumbnailProps {
  entry: MediaRow
  onClick: () => void
}

function Thumbnail({ entry, onClick }: ThumbnailProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "snap-item relative flex-shrink-0 rounded-xl overflow-hidden group",
        "size-28 sm:size-32",
        "ring-1 ring-border hover:ring-foreground/30",
        "transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]",
      )}
    >
      {isVideo(entry.filename) ? (
        <div className="size-full bg-secondary flex items-center justify-center">
          <PlayIcon className="size-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.url}
          alt={`Day ${entry.day}`}
          className="size-full object-cover"
        />
      )}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <span className="text-[11px] font-medium text-white/90">Day {entry.day}</span>
      </div>
    </button>
  )
}

function LoadingStrip() {
  return (
    <div className="flex gap-3 pb-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="size-28 rounded-xl flex-shrink-0" />
      ))}
    </div>
  )
}

export function PhotoStrip({ items, loading, fetchError, fetchErrorKind, onDelete }: PhotoStripProps) {
  const [selectedEntry, setSelectedEntry] = useState<MediaRow | null>(null)

  if (loading) return <LoadingStrip />

  if (fetchError) {
    if (fetchErrorKind === "setup_required") return <VaultSetup />
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--missed)" }}>
        Could not connect to Supabase — {fetchError}
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm text-muted-foreground">No proof uploaded yet</p>
        <p className="text-xs text-muted-foreground/60">Drop your first photo above to start</p>
      </div>
    )
  }

  return (
    <>
      {/* Native horizontal scroll with snap — no Radix ScrollArea needed */}
      <div className="snap-scroll-x -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex gap-3 pb-2 w-max">
          {items.map((entry) => (
            <Thumbnail
              key={entry.id}
              entry={entry}
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
          {/* Trailing spacer so last item doesn't cut off */}
          <div className="w-4 sm:w-6 flex-shrink-0" aria-hidden />
        </div>
      </div>

      <PhotoModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onDelete={onDelete}
      />
    </>
  )
}
