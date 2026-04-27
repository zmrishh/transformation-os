"use client"

import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { useStore, useCurrentEntry } from "@/lib/store"
import { cn } from "@/lib/utils"

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
        color: "var(--success)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.5)",
      }}
    />
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface StatusRowProps {
  label: string
  value: string
  done: boolean
  pct?: number
  overTarget?: boolean
  onClick?: () => void
}

function StatusRow({ label, value, done, pct, overTarget, onClick }: StatusRowProps) {
  const isClickable = !!onClick && !done
  const progressColor = overTarget ? "var(--missed)" : "var(--success)"

  return (
    <div className="flex flex-col py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div
            className="size-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: done ? "var(--success-muted)" : "oklch(1 0 0 / 5%)",
            }}
          >
            {done
              ? <AnimatedCheck key="done" />
              : <span className="size-1.5 rounded-full bg-border block" />
            }
          </div>

          {/* Label */}
          <span className={cn("text-sm font-medium", !done && "text-muted-foreground")}>
            {label}
          </span>
        </div>

        {/* Value / action */}
        {isClickable ? (
          <button
            onClick={onClick}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full",
              "transition-all duration-200 active:scale-[0.96]",
              "text-muted-foreground hover:text-foreground",
              "border border-border hover:border-foreground/20",
            )}
          >
            {value}
          </button>
        ) : (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              done ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {value}
          </span>
        )}
      </div>

      {/* Micro progress bar for numeric rows */}
      {pct !== undefined && (
        <div className="pl-8">
          <MicroProgress pct={pct} color={progressColor} />
        </div>
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TodayStatus() {
  const { entry, calorieTarget, proteinTarget } = useCurrentEntry()
  const logWorkout = useStore((s) => s.logWorkout)
  const currentDay = useStore((s) => s.currentDay)

  const workoutDone = entry?.workoutDone ?? false
  const calories    = entry?.calories    ?? null
  const protein     = entry?.protein     ?? null

  const calPct      = calories !== null ? (calories / calorieTarget) * 100 : 0
  const proteinPct  = protein  !== null ? (protein  / proteinTarget) * 100 : 0

  const calOver     = calories !== null && calories > calorieTarget + 100
  const proteinDone = protein  !== null && protein  >= proteinTarget * 0.9

  // Contextual value strings
  const calValue = calories !== null
    ? `${calories} / ${calorieTarget} kcal`
    : `— / ${calorieTarget} kcal`

  const proteinValue = protein !== null
    ? `${protein} / ${proteinTarget}g`
    : `— / ${proteinTarget}g`

  return (
    <section className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground tracking-wide uppercase mb-2">Today</p>

      <StatusRow
        label="Workout"
        value={workoutDone ? "Done" : "Mark complete"}
        done={workoutDone}
        onClick={() => logWorkout(currentDay)}
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
