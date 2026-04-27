"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchMedia, uploadMedia, deleteMedia, type UploadError } from "@/lib/media"
import type { MediaRow } from "@/lib/supabase"

export type FetchErrorKind = "setup_required" | "network" | null

export interface UseMediaReturn {
  items: MediaRow[]
  loading: boolean
  uploading: boolean
  fetchError: string | null
  fetchErrorKind: FetchErrorKind
  upload: (file: File, day: number) => Promise<UploadError | null>
  remove: (entry: MediaRow) => Promise<UploadError | null>
}

function classifyError(msg: string): FetchErrorKind {
  const lower = msg.toLowerCase()
  if (
    lower.includes("schema cache") ||
    lower.includes("media_entries") ||
    lower.includes("bucket not found") ||
    lower.includes("does not exist")
  ) {
    return "setup_required"
  }
  return "network"
}

export function useMedia(): UseMediaReturn {
  const [items, setItems] = useState<MediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchErrorKind, setFetchErrorKind] = useState<FetchErrorKind>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    setFetchErrorKind(null)
    const { data, error } = await fetchMedia()
    if (!mounted.current) return
    if (error) {
      setFetchError(error)
      setFetchErrorKind(classifyError(error))
    } else {
      setItems(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const upload = useCallback(
    async (file: File, day: number): Promise<UploadError | null> => {
      setUploading(true)
      const { data, error } = await uploadMedia(file, day)
      if (mounted.current) {
        setUploading(false)
        if (!error && data) {
          setItems((prev) => [data, ...prev])
        }
      }
      return error
    },
    []
  )

  const remove = useCallback(async (entry: MediaRow): Promise<UploadError | null> => {
    setItems((prev) => prev.filter((m) => m.id !== entry.id))
    const { error } = await deleteMedia(entry)
    if (mounted.current && error) {
      setItems((prev) => [entry, ...prev].sort((a, b) => b.day - a.day))
    }
    return error ?? null
  }, [])

  return { items, loading, uploading, fetchError, fetchErrorKind, upload, remove }
}
