"use client"

import { useStore } from "@/lib/store"
import type { DayEntry } from "@/lib/types"

// ─── Narrative ──────────────────────────────────────────────────────────────

function getProgressNarrative(completedCount: number, currentDay: number): string {
  if (currentDay <= 1) return "Day one. Let's build something great."
  const rate = completedCount / (currentDay - 1)
  if (rate >= 0.9) return "You're ahead of schedule"
  if (rate >= 0.75) return "Stay consistent — you're on track"
  if (rate >= 0.55) return "Keep pushing — every day counts"
  return "Time to lock back in"
}

// ─── Projection ─────────────────────────────────────────────────────────────

function getGoalProjection(
  startWeight: number,
  latestWeight: number,
  currentDay: number,
  totalDays: number
): string | null {
  if (currentDay < 7) return null
  const lossPerDay = (startWeight - latestWeight) / currentDay
  if (lossPerDay <= 0) return null
  const projected = +(latestWeight - lossPerDay * (totalDays - currentDay)).toFixed(1)
  return `At this pace: ${projected} kg by day ${totalDays}`
}

// ─── Month delta ─────────────────────────────────────────────────────────────

function getMonthDelta(
  entries: Record<number, DayEntry>,
  currentDay: number
): string | null {
  if (currentDay <= 14) return null
  const thirtyDaysAgo = Math.max(1, currentDay - 30)
  const weightEntries = Object.values(entries)
    .filter((e) => e.weight !== null)
    .sort((a, b) => a.day - b.day) as Array<DayEntry & { weight: number }>

  const pastEntry = weightEntries.find((e) => e.day >= thirtyDaysAgo)
  const currentEntry = weightEntries[weightEntries.length - 1]

  if (!pastEntry || !currentEntry || pastEntry.day === currentEntry.day) return null
  const delta = +(pastEntry.weight - currentEntry.weight).toFixed(1)
  if (delta <= 0) return null
  const daysBack = currentEntry.day - pastEntry.day
  return `↓ ${delta} kg ${daysBack >= 25 ? "this month" : `in ${daysBack} days`}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DashboardHero() {
  const currentDay = useStore((s) => s.currentDay)
  const totalDays = useStore((s) => s.totalDays)
  const startWeight = useStore((s) => s.startWeight)
  const goalWeight = useStore((s) => s.goalWeight)
  const entries = useStore((s) => s.entries)

  const weightEntries = Object.values(entries)
    .filter((e) => e.weight !== null)
    .sort((a, b) => b.day - a.day)

  const latestWeight = weightEntries[0]?.weight ?? startWeight
  const completedCount = Object.values(entries).filter((e) => e.completed).length

  const progressPct = Math.round((currentDay / totalDays) * 100)
  const weightLost = +(startWeight - latestWeight).toFixed(1)
  const weightToGo = +(latestWeight - goalWeight).toFixed(1)

  const narrative = getProgressNarrative(completedCount, currentDay)
  const projection = getGoalProjection(startWeight, latestWeight, currentDay, totalDays)
  const monthDelta = getMonthDelta(entries, currentDay)

  return (
    <section className="flex flex-col items-center text-center gap-2 pt-4 pb-2">
      {/* Narrative — above the number */}
      <p className="text-xs tracking-widest uppercase text-muted-foreground/70 mb-1 select-none">
        {narrative}
      </p>

      {/* Day number — the crown element */}
      <div className="relative">
        <p
          key={currentDay}
          className="number-pop text-[clamp(7rem,18vw,11rem)] font-bold leading-none tracking-tight text-foreground select-none"
        >
          {currentDay}
        </p>
        <p className="text-lg text-muted-foreground font-light tracking-widest -mt-2">
          of {totalDays}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-48 h-[3px] rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%`, background: "var(--success)" }}
        />
      </div>

      {/* Weight stats */}
      <div className="mt-6 flex items-baseline gap-8">
        <div className="flex flex-col items-center gap-0.5">
          <span
            key={latestWeight}
            className="number-pop text-3xl font-semibold tracking-tight"
            style={{ color: "var(--success)" }}
          >
            {latestWeight}
            <span className="text-base font-normal text-muted-foreground ml-1">kg</span>
          </span>
          <span className="text-xs text-muted-foreground tracking-wide">current</span>
          {monthDelta && (
            <span className="text-[11px] mt-0.5" style={{ color: "var(--success)" }}>
              {monthDelta}
            </span>
          )}
        </div>

        <div className="w-px h-10 bg-border" />

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-3xl font-semibold tracking-tight text-foreground/40">
            {goalWeight}
            <span className="text-base font-normal text-muted-foreground ml-1">kg</span>
          </span>
          <span className="text-xs text-muted-foreground tracking-wide">goal</span>
        </div>
      </div>

      {/* Delta + projection */}
      <div className="flex flex-col items-center gap-1 mt-1">
        {weightLost > 0 && (
          <p className="text-xs text-muted-foreground">
            <span style={{ color: "var(--success)" }}>↓ {weightLost} kg lost</span>
            {weightToGo > 0 && (
              <span className="ml-2 opacity-60">· {weightToGo} kg to go</span>
            )}
          </p>
        )}
        {projection && (
          <p className="text-xs text-muted-foreground/50 italic">{projection}</p>
        )}
      </div>
    </section>
  )
}
