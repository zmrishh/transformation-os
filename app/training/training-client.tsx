"use client"

import { useEffect, useState } from "react"
import { Nav } from "@/components/nav"
import { Separator } from "@/components/ui/separator"
import { WorkoutHeader } from "@/components/training/workout-header"
import { ExerciseGroup } from "@/components/training/exercise-group"
import { CardioSection } from "@/components/training/cardio-section"
import { TrainingFooter } from "@/components/training/training-footer"
import { useStore, useWorkoutSession } from "@/lib/store"
import { getSplitForDay, getTotalExercises } from "@/lib/training"
import { cn } from "@/lib/utils"
import type { WorkoutType } from "@/lib/types"
import { WORKOUT_TYPE_LABELS } from "@/lib/types"

const MANUAL_OPTIONS: { id: WorkoutType; label: string }[] = [
  { id: "both",   label: "Both"   },
  { id: "muscle", label: "Muscle" },
  { id: "cardio", label: "Cardio" },
]

export function TrainingClient() {
  const currentDay    = useStore((s) => s.currentDay)
  const entries       = useStore((s) => s.entries)
  const initSession   = useStore((s) => s.initWorkoutSession)
  const logWorkout    = useStore((s) => s.logWorkout)
  const session       = useWorkoutSession(currentDay)

  const split        = getSplitForDay(currentDay)
  const totalCount   = getTotalExercises(split)
  const workoutLogged = entries[currentDay]?.workoutDone ?? false

  const [manualType, setManualType] = useState<WorkoutType>("both")

  useEffect(() => {
    initSession(currentDay, split.index)
  }, [currentDay, split.index, initSession])

  // Auto-log as "both" when all exercises + cardio are completed
  useEffect(() => {
    if (!session || workoutLogged) return
    const doneCount = Object.values(session.exercises).filter((e) => e.done).length
    if (doneCount === totalCount && session.cardioDone && totalCount > 0) {
      logWorkout(currentDay, "both")
    }
  }, [session, workoutLogged, totalCount, currentDay, logWorkout])

  const doneCount = session
    ? Object.values(session.exercises).filter((e) => e.done).length
    : 0

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-lg px-4 sm:px-6 pt-20 sm:pt-24 pb-24 flex flex-col gap-10">

        <div className="section-reveal" style={{ animationDelay: "0ms" }}>
          <WorkoutHeader
            split={split}
            currentDay={currentDay}
            doneCount={doneCount}
            totalCount={totalCount}
            workoutLogged={workoutLogged}
          />
        </div>

        {split.groups.map((group, i) => (
          <div
            key={group.name}
            className="section-reveal flex flex-col gap-2"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <ExerciseGroup group={group} session={session} day={currentDay} />
          </div>
        ))}

        <Separator className="opacity-30" />

        <div
          className="section-reveal"
          style={{ animationDelay: `${(split.groups.length + 1) * 80}ms` }}
        >
          <CardioSection
            day={currentDay}
            selectedCardio={session?.selectedCardio ?? null}
            cardioDone={session?.cardioDone ?? false}
          />
        </div>

        <Separator className="opacity-30" />

        {/* Manual log section — shown when workout not yet logged */}
        {!workoutLogged && (
          <div
            className="section-reveal flex flex-col gap-4"
            style={{ animationDelay: `${(split.groups.length + 2) * 80}ms` }}
          >
            <div className="flex flex-col gap-2.5">
              <p className="text-xs text-muted-foreground/70">What did you complete?</p>
              <div className="flex gap-2 flex-wrap">
                {MANUAL_OPTIONS.map(({ id, label }) => {
                  const active = manualType === id
                  return (
                    <button
                      key={id}
                      onClick={() => setManualType(id)}
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
            </div>

            <div className="flex flex-col items-start gap-1.5">
              <button
                onClick={() => logWorkout(currentDay, manualType)}
                className="rounded-full px-8 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.97] hover:-translate-y-0.5 text-background"
                style={{ background: "var(--foreground)" }}
              >
                Log {WORKOUT_TYPE_LABELS[manualType].toLowerCase()} ✓
              </button>
              <p className="text-[11px] text-muted-foreground/40">
                Or complete all exercises + cardio to auto-log
              </p>
            </div>
          </div>
        )}

        <div
          className="section-reveal"
          style={{ animationDelay: `${(split.groups.length + 3) * 80}ms` }}
        >
          <TrainingFooter split={split} currentDay={currentDay} />
        </div>

      </main>
    </div>
  )
}
