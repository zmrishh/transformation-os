"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { OnboardingModal } from "@/components/onboarding/onboarding-modal"

/**
 * Mounts once in layout.tsx. Handles:
 *  1. Calling initialize() on first client render
 *  2. Showing a minimal loading gate until state is ready
 *  3. Rendering OnboardingModal for first-time users
 */
export function AppInit({ children }: { children: React.ReactNode }) {
  const initialize     = useStore((s) => s.initialize)
  const isInitialized  = useStore((s) => s.isInitialized)
  const needsOnboarding = useStore((s) => s.needsOnboarding)

  useEffect(() => {
    initialize()
  // initialize is a stable reference (defined in zustand set, not re-created)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show minimal spinner until Supabase responds
  if (!isInitialized && !needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="size-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--muted-foreground)", borderTopColor: "transparent" }}
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  return (
    <>
      {/* Onboarding covers the whole screen until setup is complete */}
      {needsOnboarding && <OnboardingModal />}

      {/* Render page content in background so it's ready when onboarding closes */}
      <div style={{ visibility: needsOnboarding ? "hidden" : "visible" }}>
        {children}
      </div>
    </>
  )
}
