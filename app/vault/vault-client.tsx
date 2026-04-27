"use client"

import { Nav } from "@/components/nav"
import { DropZone } from "@/components/vault/drop-zone"
import { PhotoStrip } from "@/components/vault/photo-strip"
import { Separator } from "@/components/ui/separator"
import { useMedia } from "@/hooks/use-media"
import { useStore } from "@/lib/store"

export function VaultClient() {
  const currentDay = useStore((s) => s.currentDay)
  const { items, loading, uploading, fetchError, fetchErrorKind, upload, remove } = useMedia()

  const setupRequired = fetchErrorKind === "setup_required"

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-lg px-6 pt-24 pb-20 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-1 pt-4">
          <h1 className="text-3xl font-bold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground">
            Your daily proof. 90 days of momentum.
          </p>
        </div>

        {/* Drop zone — hidden until setup is complete */}
        {!setupRequired && (
          <DropZone day={currentDay} uploading={uploading} onUpload={upload} />
        )}

        {!setupRequired && <Separator className="opacity-40" />}

        {/* Timeline + setup guide */}
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground tracking-wide uppercase">
            {setupRequired ? "Setup required" : "Timeline"}
          </p>
          <PhotoStrip
            items={items}
            loading={loading}
            fetchError={fetchError}
            fetchErrorKind={fetchErrorKind}
            onDelete={remove}
          />
        </div>
      </main>
    </div>
  )
}
