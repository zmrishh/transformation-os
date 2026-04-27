import { supabase, VAULT_BUCKET, type MediaRow, type MediaInsert } from "./supabase"
import { getStoredProfileId } from "./auth"

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/quicktime",
])

// Signed URL expiry — 1 hour. Re-generated on every fetch so UI always has a valid URL.
const SIGNED_URL_TTL = 3600

export type UploadError =
  | { code: "INVALID_TYPE"; message: string }
  | { code: "TOO_LARGE"; message: string }
  | { code: "STORAGE_ERROR"; message: string }
  | { code: "DB_ERROR"; message: string }

export function validateFile(file: File): UploadError | null {
  if (!ACCEPTED_MIME.has(file.type)) {
    return { code: "INVALID_TYPE", message: "Only JPEG, PNG, WebP, HEIC, MP4, and MOV are supported" }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { code: "TOO_LARGE", message: "File must be under 50 MB" }
  }
  return null
}

/**
 * Upload a file to the private vault bucket and insert a metadata row.
 * Storage path: {userId}/{day}/{timestamp}-{safeFilename}
 * Returns the newly created MediaRow with a signed URL on success.
 */
export async function uploadMedia(
  file: File,
  day: number
): Promise<{ data: MediaRow; error: null } | { data: null; error: UploadError }> {
  const validationError = validateFile(file)
  if (validationError) return { data: null, error: validationError }

  const userId = getStoredProfileId()
  if (!userId) return { data: null, error: { code: "STORAGE_ERROR" as const, message: "Not authenticated" } }
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  // User-scoped path so storage RLS (foldername = userId) works
  const storagePath = `${userId}/${day}/${Date.now()}-${safeName}`

  const { error: storageError } = await supabase.storage
    .from(VAULT_BUCKET)
    .upload(storagePath, file, { cacheControl: String(SIGNED_URL_TTL), upsert: false })

  if (storageError) {
    return { data: null, error: { code: "STORAGE_ERROR", message: storageError.message } }
  }

  // Generate a signed URL for immediate display (private bucket — no public URLs)
  const { data: signed, error: signError } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL)

  if (signError || !signed) {
    await supabase.storage.from(VAULT_BUCKET).remove([storagePath])
    return { data: null, error: { code: "STORAGE_ERROR", message: "Could not generate signed URL" } }
  }

  const insert: MediaInsert = {
    user_id:      userId,
    day,
    filename:     file.name,
    storage_path: storagePath,
    url:          signed.signedUrl,
  }

  const { data: row, error: dbError } = await supabase
    .from("media_entries")
    .insert(insert)
    .select()
    .single() as { data: MediaRow | null; error: { message: string } | null }

  if (dbError || !row) {
    await supabase.storage.from(VAULT_BUCKET).remove([storagePath])
    return {
      data: null,
      error: { code: "DB_ERROR", message: dbError?.message ?? "Failed to save metadata" },
    }
  }

  return { data: { ...row, url: signed.signedUrl }, error: null }
}

/**
 * Delete a media entry: removes the storage object first, then the DB row.
 * Soft-succeeds on storage "not found" so partially-cleaned rows can still
 * be removed from the table.
 */
export async function deleteMedia(entry: MediaRow): Promise<{ error: UploadError | null }> {
  const { error: storageError } = await supabase.storage
    .from(VAULT_BUCKET)
    .remove([entry.storage_path])

  if (storageError && !storageError.message.includes("Not Found")) {
    return { error: { code: "STORAGE_ERROR", message: storageError.message } }
  }

  const { error: dbError } = await supabase
    .from("media_entries")
    .delete()
    .eq("id", entry.id)

  if (dbError) {
    return { error: { code: "DB_ERROR", message: dbError.message } }
  }

  return { error: null }
}

/**
 * Fetch all media entries for the current user, then batch-generate fresh
 * signed URLs for every storage path (private bucket — stored URLs expire).
 * Returns entries sorted newest day first.
 */
export async function fetchMedia(): Promise<{ data: MediaRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("media_entries")
    .select("*")
    .order("day", { ascending: false })
    .order("created_at", { ascending: false }) as {
      data: MediaRow[] | null
      error: { message: string } | null
    }

  if (error) return { data: [], error: error.message }
  if (!data || data.length === 0) return { data: [], error: null }

  // Batch-generate signed URLs — far more efficient than N individual calls
  const { data: signed, error: signError } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrls(data.map((r) => r.storage_path), SIGNED_URL_TTL)

  if (signError || !signed) {
    // Return rows with stale URLs rather than failing entirely
    return { data, error: null }
  }

  const urlMap = new Map(
    signed
      .filter((s): s is { path: string; signedUrl: string; error: string | null } => s.path !== null)
      .map((s) => [s.path, s.signedUrl ?? ""])
  )

  const enriched: MediaRow[] = data.map((row) => ({
    ...row,
    url: urlMap.get(row.storage_path) ?? row.url,
  }))

  return { data: enriched, error: null }
}
