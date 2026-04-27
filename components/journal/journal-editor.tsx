"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import { cn } from "@/lib/utils"
import type { JournalEntry } from "@/lib/journal"

interface JournalEditorProps {
  day:          number
  initialEntry: JournalEntry | null
  onSave:       (day: number, content: string) => Promise<void>
}

type SaveStatus = "idle" | "saving" | "saved"

const AUTOSAVE_DELAY = 1500
const MAX_CHARS      = 2000

export function JournalEditor({ day, initialEntry, onSave }: JournalEditorProps) {
  const [content,    setContent]    = useState(initialEntry?.content ?? "")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [focused,    setFocused]    = useState(false)
  const timer       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync when parent passes a fresh entry (e.g. after page load)
  useEffect(() => {
    setContent(initialEntry?.content ?? "")
  }, [initialEntry?.content])

  const triggerSave = useCallback(
    (value: string) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        setSaveStatus("saving")
        await onSave(day, value)
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      }, AUTOSAVE_DELAY)
    },
    [day, onSave]
  )

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value.slice(0, MAX_CHARS)
    setContent(val)
    triggerSave(val)
  }

  async function handleBlur() {
    setFocused(false)
    // Flush any pending debounce immediately on blur
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      const currentContent = content
      const savedContent   = initialEntry?.content ?? ""
      if (currentContent !== savedContent) {
        setSaveStatus("saving")
        await onSave(day, currentContent)
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      }
    }
  }

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  const charCount   = content.length
  const nearLimit   = charCount > MAX_CHARS * 0.9
  const lastUpdated = initialEntry?.updated_at
    ? new Date(initialEntry.updated_at).toLocaleDateString("en-US", {
        month: "short",
        day:   "numeric",
        hour:  "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className="flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => setFocused(true)}
        placeholder="How did today go?"
        className={cn(
          "w-full min-h-[140px] resize-none rounded-2xl px-5 py-4",
          "text-sm leading-[1.75] tracking-[0.01em]",
          "bg-transparent transition-all duration-200",
          "placeholder:text-muted-foreground/30",
          "focus:outline-none",
          focused
            ? "border border-foreground/15"
            : "border border-border",
        )}
      />

      {/* Footer — status + char count */}
      <div className="flex items-center justify-between px-1">
        <div className="h-4">
          {saveStatus === "saving" && (
            <span className="text-[11px] text-muted-foreground/50 transition-opacity duration-300">
              saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] transition-opacity duration-300" style={{ color: "var(--success)" }}>
              saved
            </span>
          )}
          {saveStatus === "idle" && lastUpdated && !focused && (
            <span className="text-[11px] text-muted-foreground/30">
              Last saved {lastUpdated}
            </span>
          )}
        </div>
        {focused && (
          <span className={cn(
            "text-[11px] tabular-nums transition-colors duration-200",
            nearLimit ? "text-amber-500/60" : "text-muted-foreground/30"
          )}>
            {charCount} / {MAX_CHARS}
          </span>
        )}
      </div>
    </div>
  )
}
