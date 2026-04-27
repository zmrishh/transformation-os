"use client"

import type { Split } from "@/lib/training"

interface WorkoutHeaderProps {
  split: Split
  currentDay: number
  doneCount: number
  totalCount: number
  workoutLogged: boolean
}

export function WorkoutHeader({
  split,
  currentDay,
  doneCount,
  totalCount,
  workoutLogged,
}: WorkoutHeaderProps) {
  const allDone = doneCount === totalCount && totalCount > 0

  return (
    <section className="flex flex-col gap-3 pt-4">
      {/* Day badge */}
      <span className="text-xs tracking-widest uppercase text-muted-foreground/60 select-none">
        Day {currentDay}
      </span>

      {/* Split name */}
      <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none">
        {split.name}
      </h1>

      {/* Focus cue */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {split.focus}
      </p>

      {/* Progress hint */}
      {doneCount > 0 && !workoutLogged && (
        <p className="text-xs" style={{ color: allDone ? "var(--success)" : "var(--muted-foreground)" }}>
          {allDone
            ? "All exercises done — finish cardio to complete"
            : `${doneCount} of ${totalCount} exercises done`}
        </p>
      )}

      {workoutLogged && (
        <p className="text-xs" style={{ color: "var(--success)" }}>
          Workout logged ✓
        </p>
      )}
    </section>
  )
}
