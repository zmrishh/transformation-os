"use client"

import { useState, useEffect } from "react"
import { CheckIcon } from "lucide-react"
import { useStore, useCurrentEntry } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { WorkoutType } from "@/lib/types"
import { WORKOUT_TYPE_LABELS } from "@/lib/types"

// ─── Micro progress bar ──────────────────────────────────────────────────────

function MicroProgress({ pct, color = "var(--success)" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-[2px] rounded-full bg-border overflow-hidden mt-1.5">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  )
}

// ─── Animated check icon ─────────────────────────────────────────────────────

function AnimatedCheck() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])
  return (
    <CheckIcon
      className="size-3 transition-all duration-300"
      style={{
        color:     "var(--success)",
        opacity:   visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.5)",
      }}
    />
  )
}

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ done }: { done: boolean }) {
  return (
    <div
      className="size-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
      style={{ background: done ? "var(--success-muted)" : "oklch(1 0 0 / 5%)" }}
    >
      {done
        ? <AnimatedCheck key="done" />
        : <span className="size-1.5 rounded-full bg-border block" />
      }
    </div>
  )
}

// ─── Generic numeric status row ───────────────────────────────────────────────

interface StatusRowProps {
  label:       string
  value:       string
  done:        boolean
  pct?:        number
  overTarget?: boolean
}

function StatusRow({ label, value, done, pct, overTarget }: StatusRowProps) {
  const progressColor = overTarget ? "var(--missed)" : "var(--success)"
  return (
    <div className="flex flex-col py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot done={done} />
          <span className={cn("text-sm font-medium", !done && "text-muted-foreground")}>
            {label}
          </span>
        </div>
        <span className={cn("text-sm font-medium tabular-nums", done ? "text-foreground" : "text-muted-foreground")}>
          {value}
        </span>
      </div>
      {pct !== undefined && (
        <div className="pl-8">
          <MicroProgress pct={pct} color={progressColor} />
        </div>
      )}
    </div>
  )
}

// ─── Workout row — type-aware ─────────────────────────────────────────────────

const WORKOUT_OPTIONS: { id: WorkoutType; label: string }[] = [
  { id: "both",   label: "Both"   },
  { id: "muscle", label: "Muscle" },
  { id: "cardio", label: "Cardio" },
]

function WorkoutRow({
  done,
  workoutType,
  currentDay,
}: {
  done:        boolean
  workoutType: WorkoutType | null
  currentDay:  number
}) {
  const logWorkout      = useStore((s) => s.logWorkout)
  const [selected, setSelected] = useState<WorkoutType | null>(null)

  // If already done, render a simple read-only row
  if (done) {
    const label = workoutType ? WORKOUT_TYPE_LABELS[workoutType] : "Done"
    return (
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <StatusDot done />
          <span className="text-sm font-medium">Workout</span>
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
    )
  }

  // Interactive: show type pills, then log button
  return (
    <div className="flex flex-col py-3 border-b border-border gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot done={false} />
          <span className="text-sm font-medium text-muted-foreground">Workout</span>
        </div>
        <span className="text-xs text-muted-foreground/60">not logged</span>
      </div>

      {/* Type selector */}
      <div className="pl-8 flex flex-col gap-2.5">
        <p className="text-xs text-muted-foreground/70">What did you train?</p>
        <div className="flex gap-2 flex-wrap">
          {WORKOUT_OPTIONS.map(({ id, label }) => {
            const active = selected === id
            return (
              <button
                key={id}
                onClick={() => setSelected(active ? null : id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium",
                  "transition-all duration-200 active:scale-[0.96]",
                  active
                    ? "text-background"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                )}
                style={active ? { background: "var(--foreground)" } : undefined}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Log button — appears once a type is chosen */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: selected ? "44px" : "0px", opacity: selected ? 1 : 0 }}
        >
          <button
            onClick={() => { if (selected) logWorkout(currentDay, selected) }}
            className={cn(
              "rounded-full px-5 py-2 text-xs font-medium",
              "transition-all duration-200 active:scale-[0.97]",
              "text-background",
            )}
            style={{ background: "var(--foreground)" }}
          >
            Log {selected ? WORKOUT_TYPE_LABELS[selected].toLowerCase() : "workout"} ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TodayStatus() {
  const { entry, calorieTarget, proteinTarget } = useCurrentEntry()
  const currentDay = useStore((s) => s.currentDay)

  const workoutDone = entry?.workoutDone ?? false
  const workoutType = entry?.workoutType ?? null
  const calories    = entry?.calories    ?? null
  const protein     = entry?.protein     ?? null

  const calPct      = calories !== null ? (calories / calorieTarget) * 100 : 0
  const proteinPct  = protein  !== null ? (protein  / proteinTarget) * 100 : 0

  const calOver     = calories !== null && calories > calorieTarget + 100
  const proteinDone = protein  !== null && protein  >= proteinTarget * 0.9

  const calValue = calories !== null
    ? `${calories} / ${calorieTarget} kcal`
    : `— / ${calorieTarget} kcal`

  const proteinValue = protein !== null
    ? `${protein} / ${proteinTarget}g`
    : `— / ${proteinTarget}g`

  return (
    <section className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground tracking-wide uppercase mb-2">Today</p>

      <WorkoutRow
        done={workoutDone}
        workoutType={workoutType}
        currentDay={currentDay}
      />

      <StatusRow
        label="Calories"
        value={calValue}
        done={calories !== null && !calOver}
        pct={calPct}
        overTarget={calOver}
      />

      <StatusRow
        label="Protein"
        value={proteinValue}
        done={proteinDone}
        pct={proteinPct}
      />
    </section>
  )
}
