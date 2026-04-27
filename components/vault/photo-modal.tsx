"use client"

import { useState } from "react"
import { XIcon, TrashIcon, LoaderIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { MediaRow } from "@/lib/supabase"
import type { UploadError } from "@/lib/media"

interface PhotoModalProps {
  entry: MediaRow | null
  onClose: () => void
  onDelete: (entry: MediaRow) => Promise<UploadError | null>
}

const isVideo = (filename: string) => /\.(mp4|mov|webm|avi)$/i.test(filename)

export function PhotoModal({ entry, onClose, onDelete }: PhotoModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!entry) return
    setDeleting(true)
    setDeleteError(null)
    const error = await onDelete(entry)
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogTitle className="sr-only">
        Day {entry?.day} — {entry?.filename}
      </DialogTitle>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-3xl w-full overflow-hidden">
        <div className="relative rounded-2xl overflow-hidden bg-card">
          {/* Toolbar */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Day {entry?.day}
              </span>
              <span className="text-sm font-medium text-white truncate max-w-48">
                {entry?.filename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
              >
                {deleting ? (
                  <LoaderIcon className="size-3.5 text-white/70 animate-spin" />
                ) : (
                  <TrashIcon className="size-3.5 text-white/70" />
                )}
              </button>
              <button
                onClick={onClose}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
              >
                <XIcon className="size-3.5 text-white/70" />
              </button>
            </div>
          </div>

          {/* Delete error inline */}
          {deleteError && (
            <div className="absolute bottom-0 inset-x-0 z-10 px-5 py-3 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-xs text-center" style={{ color: "var(--missed)" }}>
                {deleteError}
              </p>
            </div>
          )}

          {/* Media */}
          {entry && (
            isVideo(entry.filename) ? (
              <video
                src={entry.url}
                controls
                autoPlay
                className="w-full max-h-[80vh] object-contain bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.url}
                alt={`Day ${entry.day} progress`}
                className="w-full max-h-[80vh] object-contain bg-black"
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
