"use client"

import type { MuscleGroup, WorkoutSession } from "@/lib/training"
import { ExerciseRow } from "./exercise-row"

interface ExerciseGroupProps {
  group: MuscleGroup
  session: WorkoutSession | null
  day: number
}

export function ExerciseGroup({ group, session, day }: ExerciseGroupProps) {
  const doneCount = group.exercises.filter(
    (ex) => session?.exercises[ex.id]?.done ?? false
  ).length

  return (
    <div className="flex flex-col gap-0">
      {/* Group header */}
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          {group.name}
        </h3>
        {doneCount > 0 && (
          <span className="text-[11px] tabular-nums" style={{ color: "var(--success)" }}>
            {doneCount}/{group.exercises.length}
          </span>
        )}
      </div>

      {/* Exercises */}
      {group.exercises.map((exercise) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          log={session?.exercises[exercise.id] ?? null}
          day={day}
        />
      ))}
    </div>
  )
}
