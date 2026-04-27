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
 *
 * Also installs a midnight timer so currentDay advances automatically
 * while the tab remains open — no refresh required.
 */
export function AppInit({ children }: { children: React.ReactNode }) {
  const initialize      = useStore((s) => s.initialize)
  const refreshDay      = useStore((s) => s.refreshDay)
  const isLoading       = useStore((s) => s.isLoading)
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const isInitialized   = useStore((s) => s.isInitialized)
  const needsOnboarding = useStore((s) => s.needsOnboarding)
  const startDate       = useStore((s) => s.startDate)

  // Initial data load
  useEffect(() => {
    initialize()
  // initialize is a stable store reference — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Midnight auto-advance ──────────────────────────────────────────
  // Once startDate is known (after initialize), schedule a one-shot
  // setTimeout that fires exactly at local midnight, calls refreshDay(),
  // then starts a 24-hour interval for subsequent days.
  // All timers are cleared on unmount to prevent memory leaks.
  useEffect(() => {
    if (!startDate) return

    let dailyInterval: ReturnType<typeof setInterval> | null = null

    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)                         // next 00:00:00 local
    const msUntilMidnight = midnight.getTime() - Date.now()

    const midnightTimeout = setTimeout(() => {
      refreshDay()
      // After the first midnight tick, re-fire every 24 h
      dailyInterval = setInterval(refreshDay, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)

    return () => {
      clearTimeout(midnightTimeout)
      if (dailyInterval !== null) clearInterval(dailyInterval)
    }
  // Re-schedule if startDate changes (e.g., new onboarding session)
  }, [startDate, refreshDay])

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
