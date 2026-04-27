"use client"

import { useState, useRef } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import type { Exercise, ExerciseLog } from "@/lib/training"
import { makeDefaultLog } from "@/lib/training"

interface ExerciseRowProps {
  exercise: Exercise
  log: ExerciseLog | null
  day: number
}

export function ExerciseRow({ exercise, log, day }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false)
  const setExerciseLog = useStore((s) => s.setExerciseLog)

  const current = log ?? makeDefaultLog(exercise)
  const done = current.done

  function toggle() { setExpanded((v) => !v) }

  function markDone() {
    setExerciseLog(day, exercise.id, { ...current, done: !done })
    if (!done) setExpanded(false)
  }

  function updateSets(delta: number) {
    const next = Math.max(1, Math.min(10, current.sets + delta))
    setExerciseLog(day, exercise.id, { ...current, sets: next })
  }

  function updateWeight(val: string) {
    setExerciseLog(day, exercise.id, { ...current, weight: val })
  }

  return (
    <div className="border-b border-border last:border-0">
      {/* ── Main row ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between py-3.5 cursor-pointer select-none group"
        onClick={toggle}
      >
        <div className="flex items-center gap-3.5">
          {/* Done indicator */}
          <button
            onClick={(e) => { e.stopPropagation(); markDone() }}
            className={cn(
              "size-5 rounded-full flex items-center justify-center flex-shrink-0",
              "transition-all duration-250 active:scale-90",
            )}
            style={{
              background: done ? "var(--success-muted)" : "oklch(1 0 0 / 5%)",
              border: done ? "none" : "1px solid var(--border)",
            }}
          >
            {done && (
              <CheckIcon className="size-3 transition-all duration-200" style={{ color: "var(--success)" }} />
            )}
          </button>

          {/* Exercise name */}
          <span
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              done ? "text-muted-foreground line-through opacity-50" : "text-foreground",
            )}
          >
            {exercise.name}
          </span>
        </div>

        {/* Right: sets × reps + chevron */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {current.sets} × {current.reps || exercise.defaultReps}
            {current.weight && (
              <span className="ml-1 opacity-60">· {current.weight} kg</span>
            )}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 text-muted-foreground/50 transition-transform duration-250",
              expanded ? "rotate-180" : "",
            )}
          />
        </div>
      </div>

      {/* ── Expanded controls ─────────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          expanded ? "max-h-40" : "max-h-0",
        )}
      >
        <div className="pl-9 pb-4 flex flex-col gap-4">
          {/* Coach tip */}
          {exercise.tip && (
            <p className="text-[11px] italic text-muted-foreground/60">{exercise.tip}</p>
          )}

          {/* Sets / reps / weight row */}
          <div className="flex items-center gap-6">
            {/* Sets stepper */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Sets</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSets(-1)}
                  className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm active:scale-90"
                  style={{ background: "var(--secondary)" }}
                >
                  −
                </button>
                <span className="text-sm font-medium tabular-nums w-4 text-center">{current.sets}</span>
                <button
                  onClick={() => updateSets(1)}
                  className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm active:scale-90"
                  style={{ background: "var(--secondary)" }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Reps (display only — defaultReps is the guide) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Reps</span>
              <span className="text-sm font-medium text-muted-foreground">
                {exercise.defaultReps}
              </span>
            </div>

            {/* Weight input */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Weight</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={current.weight}
                  placeholder="—"
                  min={0}
                  max={500}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateWeight(e.target.value)}
                  className={cn(
                    "w-14 bg-transparent text-sm font-medium text-foreground",
                    "placeholder:text-muted-foreground/30 focus:outline-none tabular-nums",
                    "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  )}
                />
                <span className="text-xs text-muted-foreground">kg</span>
              </div>
            </div>
          </div>

          {/* Mark done button */}
          <button
            onClick={(e) => { e.stopPropagation(); markDone() }}
            className={cn(
              "self-start text-xs font-medium px-4 py-2 rounded-full",
              "transition-all duration-200 active:scale-95",
            )}
            style={{
              background: done ? "oklch(1 0 0 / 5%)" : "var(--success-muted)",
              color:      done ? "var(--muted-foreground)"   : "var(--success)",
            }}
          >
            {done ? "Mark undone" : "Mark as done ✓"}
          </button>
        </div>
      </div>
    </div>
  )
}
