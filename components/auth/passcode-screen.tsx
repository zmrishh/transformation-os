"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { loginWithPasscode } from "@/lib/auth"
import { useStore } from "@/lib/store"

export function PasscodeScreen() {
  const initialize = useStore((s) => s.initialize)

  const [passcode, setPasscode] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUnlock() {
    if (passcode.trim().length < 4) {
      setError("Passcode must be at least 4 characters")
      return
    }
    setLoading(true)
    setError(null)

    try {
      await loginWithPasscode(passcode)
      // Profile ID is now in localStorage — initialize will pick it up
      await initialize()
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "Something went wrong"
      if (msg.includes("schema cache") || msg.includes("profiles")) {
        setError("Database not set up yet — run 0003_passcode_auth.sql in Supabase SQL Editor")
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "var(--background)" }}
    >
      <div className="section-reveal w-full max-w-xs flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-3 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground/50 select-none">
            Transformation OS
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Enter your key</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Same key on any device loads your data.
            <br />
            A new key starts a fresh profile.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-4 cursor-text"
            style={{ background: "var(--secondary)" }}
            onClick={() => inputRef.current?.focus()}
          >
            <input
              ref={inputRef}
              type="password"
              autoComplete="off"
              autoFocus
              value={passcode}
              placeholder="••••••••"
              onChange={(e) => { setPasscode(e.target.value); setError(null) }}
              onKeyDown={(e) => { if (e.key === "Enter") handleUnlock() }}
              className={cn(
                "flex-1 bg-transparent text-xl font-semibold text-foreground tracking-[0.3em]",
                "placeholder:text-muted-foreground/30 placeholder:tracking-normal",
                "focus:outline-none",
              )}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "var(--missed)" }}>
              {error}
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleUnlock}
          disabled={loading}
          className={cn(
            "rounded-full py-4 text-base font-medium tracking-wide min-h-[52px]",
            "transition-all duration-200 active:scale-[0.97]",
            loading
              ? "bg-secondary text-muted-foreground cursor-wait"
              : "bg-primary text-primary-foreground shadow-[0_4px_24px_oklch(0_0_0/0.5)] hover:-translate-y-0.5",
          )}
        >
          {loading ? "Unlocking…" : "Unlock"}
        </button>

        <p className="text-[11px] text-center text-muted-foreground/30 select-none">
          No account. No email. Just your key.
        </p>

      </div>
    </div>
  )
}
