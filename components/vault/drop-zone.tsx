"use client"

import { useState, useRef, useCallback, useEffect, type DragEvent, type ChangeEvent } from "react"
import { UploadCloudIcon, LoaderIcon, XIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateFile, type UploadError } from "@/lib/media"

interface DropZoneProps {
  day: number
  uploading: boolean
  onUpload: (file: File, day: number) => Promise<UploadError | null>
}

const isImage = (file: File) => file.type.startsWith("image/")

export function DropZone({ day, uploading, onUpload }: DropZoneProps) {
  const [isDragging, setIsDragging]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Revoke preview URL on unmount or when it changes
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function stageFile(file: File) {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) { setError(validationError.message); return }

    setPendingFile(file)
    if (isImage(file)) setPreviewUrl(URL.createObjectURL(file))
    else               setPreviewUrl(null)
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  const confirmUpload = useCallback(async () => {
    if (!pendingFile) return
    const uploadError = await onUpload(pendingFile, day)
    if (uploadError) {
      setError(uploadError.message)
    } else {
      cancelPreview()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile, onUpload, day])

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!uploading && !pendingFile) setIsDragging(true)
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) stageFile(file)
  }
  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) stageFile(file)
    e.target.value = ""
  }

  const isActive = isDragging && !uploading && !pendingFile

  // ── Preview state ──────────────────────────────────────────────────────────
  if (pendingFile) {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="relative rounded-2xl overflow-hidden border border-border"
          style={{ minHeight: "16rem" }}
        >
          {/* Image preview */}
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-64 object-cover"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center min-h-64 gap-2"
              style={{ background: "var(--secondary)" }}
            >
              <UploadCloudIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{pendingFile.name}</p>
            </div>
          )}

          {/* Overlay toolbar */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-xs text-white/70 truncate max-w-48">{pendingFile.name}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelPreview}
                disabled={uploading}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
              >
                <XIcon className="size-3.5 text-white/80" />
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className={cn(
                  "flex items-center gap-1.5 px-4 h-8 rounded-full text-xs font-medium",
                  "transition-all duration-200 active:scale-[0.96]",
                  uploading ? "opacity-60 cursor-not-allowed" : "",
                )}
                style={{
                  background: "var(--success)",
                  color: "var(--primary-foreground)",
                }}
              >
                {uploading
                  ? <><LoaderIcon className="size-3 animate-spin" /> Uploading…</>
                  : <><CheckIcon className="size-3" /> Upload</>
                }
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-center" style={{ color: "var(--missed)" }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  // ── Default / drag state ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-5 rounded-2xl",
          "transition-all duration-300 min-h-64 px-8 py-12",
          uploading
            ? "cursor-not-allowed border border-dashed border-border opacity-60"
            : "cursor-pointer border border-dashed hover:border-foreground/20",
          isActive ? "scale-[1.01]" : "",
        )}
        style={{
          borderColor: isActive ? "var(--success)" : undefined,
          background:  isActive ? "var(--success-muted)" : "transparent",
        }}
      >
        <div
          className="size-14 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{ background: isActive ? "var(--success-muted)" : "var(--secondary)" }}
        >
          {uploading
            ? <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
            : <UploadCloudIcon
                className="size-6 transition-colors duration-300"
                style={{ color: isActive ? "var(--success)" : "var(--muted-foreground)" }}
              />
          }
        </div>

        <div className="text-center flex flex-col gap-1.5">
          <p className="text-base font-medium text-foreground">
            {isActive ? "Release to stage" : "Drop your daily proof"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isActive ? "File will preview before uploading" : "Photo or video · click or drag"}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
          className="sr-only"
          disabled={uploading}
          onChange={onInputChange}
        />
      </div>

      {error && (
        <p className="text-xs text-center" style={{ color: "var(--missed)" }}>
          {error}
        </p>
      )}
    </div>
  )
}
