"use client"

import { useStore } from "@/lib/store"
import type { DayEntry } from "@/lib/types"

// ─── Insight derivation ──────────────────────────────────────────────────────

type Tone = "positive" | "neutral" | "nudge"

interface Insight {
  text: string
  tone: Tone
}

const NEUTRAL_MESSAGES = [
  "Every logged day compounds.",
  "Discipline is the foundation.",
  "Small wins, every day.",
  "Progress is built in reps.",
  "The score takes care of itself.",
]

function deriveInsight(
  entries: Record<number, DayEntry>,
  currentDay: number,
  calorieTarget: number,
  proteinTarget: number
): Insight {
  const recentDays = Array.from({ length: 7 }, (_, i) => currentDay - 1 - i).filter((d) => d >= 1)

  // Workout streak
  let streak = 0
  for (let day = currentDay - 1; day >= 1; day--) {
    if (entries[day]?.workoutDone) streak++
    else break
  }
  if (streak >= 7)
    return { text: `${streak}-day workout streak — remarkable consistency`, tone: "positive" }
  if (streak >= 4)
    return { text: `${streak} workouts in a row — keep the momentum`, tone: "positive" }

  // Missed workouts this week
  const missedWorkouts = recentDays.filter((d) => entries[d] && !entries[d].workoutDone).length
  if (missedWorkouts >= 3)
    return { text: `${missedWorkouts} missed workouts this week — time to refocus`, tone: "nudge" }

  // Protein below target
  const proteinDays = recentDays.filter((d) => entries[d]?.protein !== null)
  if (proteinDays.length >= 3) {
    const avg = proteinDays.reduce((s, d) => s + (entries[d]?.protein ?? 0), 0) / proteinDays.length
    if (avg < proteinTarget * 0.8)
      return {
        text: `Protein averaging ${Math.round(avg)}g this week — aim for ${proteinTarget}g`,
        tone: "nudge",
      }
  }

  // Calories running high
  const calDays = recentDays.filter((d) => entries[d]?.calories !== null)
  if (calDays.length >= 3) {
    const avg = calDays.reduce((s, d) => s + (entries[d]?.calories ?? 0), 0) / calDays.length
    if (avg > calorieTarget + 300)
      return {
        text: `Calories running high — weekly avg ${Math.round(avg)} kcal`,
        tone: "nudge",
      }
  }

  // Consistency rate this week vs last
  const thisWeekCompleted = recentDays.filter((d) => entries[d]?.completed).length
  const thisWeekLogged    = recentDays.filter((d) => entries[d]).length
  if (thisWeekLogged >= 4) {
    const rate = thisWeekCompleted / thisWeekLogged
    if (rate >= 0.85)
      return { text: "Consistency is building — you're forming the habit", tone: "positive" }
    if (rate < 0.4)
      return { text: "Low completion rate this week — one day at a time", tone: "nudge" }
  }

  // Default: rotating neutral
  return {
    text: NEUTRAL_MESSAGES[currentDay % NEUTRAL_MESSAGES.length],
    tone: "neutral",
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const TONE_COLOR: Record<Tone, string> = {
  positive: "var(--success)",
  neutral:  "var(--muted-foreground)",
  nudge:    "var(--muted-foreground)",
}

export function SystemInsight() {
  const entries       = useStore((s) => s.entries)
  const currentDay    = useStore((s) => s.currentDay)
  const calorieTarget = useStore((s) => s.calorieTarget)
  const proteinTarget = useStore((s) => s.proteinTarget)

  const { text, tone } = deriveInsight(entries, currentDay, calorieTarget, proteinTarget)

  return (
    <p
      className="text-xs leading-relaxed transition-all duration-500 select-none"
      style={{ color: TONE_COLOR[tone] }}
    >
      {text}
    </p>
  )
}
