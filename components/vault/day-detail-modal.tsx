"use client"

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
} from "react"
import {
  XIcon,
  UploadCloudIcon,
  LoaderIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PencilIcon,
  CheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { validateFile, type UploadError } from "@/lib/media"
import { dayToDate } from "@/lib/progress"
import type { MediaRow } from "@/lib/supabase"
import type { DayEntry } from "@/lib/types"
import { WORKOUT_TYPE_LABELS } from "@/lib/types"
import type { JournalEntry } from "@/lib/journal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayDetailModalProps {
  day:          number
  isOpen:       boolean
  onClose:      () => void
  mediaItems:   MediaRow[]
  workoutEntry: DayEntry | undefined
  startDate:    string | null
  journalEntry: JournalEntry | null
  onSaveJournal: (day: number, content: string) => Promise<void>
  onUpload:     (file: File) => Promise<UploadError | null>
  onDeleteMedia: (entry: MediaRow) => Promise<UploadError | null>
  uploading:    boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDay(startDate: string | null, day: number): string {
  if (!startDate) return `Day ${day}`
  try {
    const iso  = dayToDate(startDate, day)
    const date = new Date(iso)
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  } catch {
    return `Day ${day}`
  }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items:    MediaRow[]
  index:    number
  onClose:  () => void
  onChange: (i: number) => void
}) {
  const item     = items[index]
  const isVideo  = item.filename.match(/\.(mp4|mov)$/i)
  const hasPrev  = index > 0
  const hasNext  = index < items.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose()
      if (e.key === "ArrowLeft"  && hasPrev) onChange(index - 1)
      if (e.key === "ArrowRight" && hasNext) onChange(index + 1)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [index, hasPrev, hasNext, onClose, onChange])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Media */}
      <div
        className="relative max-w-[92vw] max-h-[86vh] flex items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-full max-h-[86vh] rounded-xl object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.filename}
            className="max-w-full max-h-[86vh] rounded-xl object-contain select-none"
            draggable={false}
          />
        )}
      </div>

      {/* Prev / Next */}
      {hasPrev && (
        <button
          onClick={() => onChange(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ChevronLeftIcon className="size-5 text-white" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onChange(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ChevronRightIcon className="size-5 text-white" />
        </button>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={item.url}
          download={item.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <DownloadIcon className="size-4 text-white" />
        </a>
        <button
          onClick={onClose}
          className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <XIcon className="size-4 text-white" />
        </button>
      </div>
    </div>
  )
}

// ─── Journal section ──────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 1500

type SaveStatus = "idle" | "saving" | "saved"

function JournalSection({
  day,
  initialEntry,
  onSave,
}: {
  day:          number
  initialEntry: JournalEntry | null
  onSave:       (day: number, content: string) => Promise<void>
}) {
  const [content,    setContent]    = useState(initialEntry?.content ?? "")
  const [editing,    setEditing]    = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const timer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync if parent updates the entry (e.g., another modal instance saved)
  useEffect(() => {
    if (!editing) setContent(initialEntry?.content ?? "")
  }, [initialEntry?.content, editing])

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    setSaveStatus("saving")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await onSave(day, val)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, AUTOSAVE_DELAY)
  }

  async function handleBlur() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (content !== (initialEntry?.content ?? "")) {
      setSaveStatus("saving")
      await onSave(day, content)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }
    setEditing(false)
  }

  function openEditor() {
    setEditing(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const hasContent = content.trim().length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Journal</p>
        {saveStatus === "saving" && (
          <span className="text-[10px] text-muted-foreground/50">saving…</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-[10px]" style={{ color: "var(--success)" }}>saved</span>
        )}
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="How did this day go?"
          rows={5}
          className={cn(
            "w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed",
            "bg-transparent border border-border focus:border-foreground/20 focus:outline-none",
            "placeholder:text-muted-foreground/40 transition-colors duration-200",
          )}
        />
      ) : hasContent ? (
        <button
          onClick={openEditor}
          className="group text-left"
        >
          <p className="text-sm leading-relaxed text-foreground/85 line-clamp-5">
            {content}
          </p>
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <PencilIcon className="size-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/50">Edit</span>
          </div>
        </button>
      ) : (
        <button
          onClick={openEditor}
          className={cn(
            "rounded-xl border border-dashed border-border px-4 py-6",
            "text-sm text-muted-foreground/50 text-center w-full",
            "hover:border-foreground/15 hover:text-muted-foreground transition-colors duration-200",
          )}
        >
          Write about this day →
        </button>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function DayDetailModal({
  day,
  isOpen,
  onClose,
  mediaItems,
  workoutEntry,
  startDate,
  journalEntry,
  onSaveJournal,
  onUpload,
  onDeleteMedia,
  uploading,
}: DayDetailModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploadError,   setUploadError]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && lightboxIndex === null) onClose()
    }
    if (isOpen) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onClose, lightboxIndex])

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const validationErr = validateFile(file)
    if (validationErr) { setUploadError(validationErr.message); return }

    setUploadError(null)
    const err = await onUpload(file)
    if (err) setUploadError(err.message)
  }, [onUpload])

  if (!isOpen) return null

  const workoutLabel = workoutEntry?.workoutDone
    ? (workoutEntry.workoutType ? WORKOUT_TYPE_LABELS[workoutEntry.workoutType] : "Done")
    : null

  const dayLabel = formatDay(startDate, day)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Panel — bottom sheet on mobile, centered card on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 bg-background overflow-y-auto",
          // Mobile: full-width bottom sheet
          "inset-x-0 bottom-0 rounded-t-3xl max-h-[92vh]",
          // Desktop: centered card
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-3xl sm:max-w-lg sm:w-full sm:max-h-[88vh] sm:bottom-auto",
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-4 pb-3">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">
              Day {day}
            </p>
            <h2 className="text-lg font-bold leading-tight">{dayLabel}</h2>
            {workoutLabel && (
              <div className="flex items-center gap-1 mt-1.5">
                <CheckIcon className="size-3" style={{ color: "var(--success)" }} />
                <span className="text-xs text-muted-foreground">{workoutLabel}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors duration-150 flex-shrink-0 mt-0.5"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Media section ── */}
        <div className="px-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Photos &amp; Videos
              {mediaItems.length > 0 && (
                <span className="ml-1.5 text-muted-foreground/50">({mediaItems.length})</span>
              )}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
                "border border-border transition-all duration-200",
                "hover:border-foreground/20 hover:text-foreground text-muted-foreground",
                uploading && "opacity-50 cursor-not-allowed",
              )}
            >
              {uploading
                ? <LoaderIcon className="size-3 animate-spin" />
                : <UploadCloudIcon className="size-3" />
              }
              {uploading ? "Uploading…" : "Add"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {uploadError && (
            <p className="text-xs mb-3" style={{ color: "var(--missed)" }}>{uploadError}</p>
          )}

          {mediaItems.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full rounded-2xl border border-dashed border-border",
                "flex flex-col items-center justify-center gap-2 py-10",
                "text-muted-foreground/50 hover:text-muted-foreground",
                "hover:border-foreground/15 transition-colors duration-200",
              )}
            >
              <UploadCloudIcon className="size-6" />
              <span className="text-sm">Add your first photo for Day {day}</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map((item, idx) => {
                const isVideo = item.filename.match(/\.(mp4|mov)$/i)
                return (
                  <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-secondary">
                    {isVideo ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={item.url}
                        className="w-full h-full object-cover cursor-pointer"
                        muted
                        playsInline
                        preload="metadata"
                        onClick={() => setLightboxIndex(idx)}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.04]"
                        onClick={() => setLightboxIndex(idx)}
                      />
                    )}
                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteMedia(item)}
                      className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <TrashIcon className="size-3 text-white/80" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Separator ── */}
        <div className="mx-6 border-t border-border mb-5" />

        {/* ── Journal section ── */}
        <div className="px-6 pb-8">
          <JournalSection
            day={day}
            initialEntry={journalEntry}
            onSave={onSaveJournal}
          />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && mediaItems.length > 0 && (
        <Lightbox
          items={mediaItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  )
}
