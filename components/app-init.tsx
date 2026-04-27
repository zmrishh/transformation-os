"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { PasscodeScreen } from "@/components/auth/passcode-screen"
import { OnboardingModal } from "@/components/onboarding/onboarding-modal"

/**
 * Mounted once in layout.tsx. Handles the full init lifecycle:
 *
 *  isLoading              → spinner
 *  !isAuthenticated       → PasscodeScreen
 *  needsOnboarding        → OnboardingModal (covers page)
 *  isInitialized          → render children
 */
export function AppInit({ children }: { children: React.ReactNode }) {
  const initialize      = useStore((s) => s.initialize)
  const isLoading       = useStore((s) => s.isLoading)
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const isInitialized   = useStore((s) => s.isInitialized)
  const needsOnboarding = useStore((s) => s.needsOnboarding)

  useEffect(() => {
    initialize()
  // initialize is a stable store reference — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Loading ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="size-5 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--muted-foreground)",
            borderTopColor: "transparent",
          }}
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  // ── Not authenticated ─────────────────────────────────────────────
  if (!isAuthenticated) {
    return <PasscodeScreen />
  }

  // ── Authenticated: onboarding or app ─────────────────────────────
  return (
    <>
      {/* OnboardingModal covers the screen until user_progress is created */}
      {needsOnboarding && <OnboardingModal />}

      {/* Page content rendered in background (hidden during onboarding) */}
      {(isInitialized || needsOnboarding) && (
        <div style={{ visibility: needsOnboarding ? "hidden" : "visible" }}>
          {children}
        </div>
      )}
    </>
  )
}
