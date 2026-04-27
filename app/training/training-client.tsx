"use client"

import { useEffect } from "react"
import { Nav } from "@/components/nav"
import { Separator } from "@/components/ui/separator"
import { WorkoutHeader } from "@/components/training/workout-header"
import { ExerciseGroup } from "@/components/training/exercise-group"
import { CardioSection } from "@/components/training/cardio-section"
import { TrainingFooter } from "@/components/training/training-footer"
import { useStore, useWorkoutSession } from "@/lib/store"
import { getSplitForDay, getTotalExercises } from "@/lib/training"

export function TrainingClient() {
  const currentDay       = useStore((s) => s.currentDay)
  const entries          = useStore((s) => s.entries)
  const initSession      = useStore((s) => s.initWorkoutSession)
  const logWorkout       = useStore((s) => s.logWorkout)
  const session          = useWorkoutSession(currentDay)

  const split        = getSplitForDay(currentDay)
  const totalCount   = getTotalExercises(split)
  const workoutLogged = entries[currentDay]?.workoutDone ?? false

  // Init session on first visit for this day
  useEffect(() => {
    initSession(currentDay, split.index)
  }, [currentDay, split.index, initSession])

  // Auto-log workout when all exercises + cardio are completed
  useEffect(() => {
    if (!session || workoutLogged) return
    const doneCount = Object.values(session.exercises).filter((e) => e.done).length
    if (doneCount === totalCount && session.cardioDone && totalCount > 0) {
      logWorkout(currentDay)
    }
  }, [session, workoutLogged, totalCount, currentDay, logWorkout])

  const doneCount = session
    ? Object.values(session.exercises).filter((e) => e.done).length
    : 0

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-lg px-4 sm:px-6 pt-20 sm:pt-24 pb-24 flex flex-col gap-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="section-reveal" style={{ animationDelay: "0ms" }}>
          <WorkoutHeader
            split={split}
            currentDay={currentDay}
            doneCount={doneCount}
            totalCount={totalCount}
            workoutLogged={workoutLogged}
          />
        </div>

        {/* ── Exercise groups ──────────────────────────────────────────── */}
        {split.groups.map((group, i) => (
          <div
            key={group.name}
            className="section-reveal flex flex-col gap-2"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <ExerciseGroup
              group={group}
              session={session}
              day={currentDay}
            />
          </div>
        ))}

        <Separator className="opacity-30" />

        {/* ── Cardio ───────────────────────────────────────────────────── */}
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

        {/* ── Manual log button (shown when not yet logged) ────────────── */}
        {!workoutLogged && (
          <div
            className="section-reveal flex flex-col items-center gap-2"
            style={{ animationDelay: `${(split.groups.length + 2) * 80}ms` }}
          >
            <button
              onClick={() => logWorkout(currentDay)}
              className="rounded-full px-10 py-3.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] hover:-translate-y-0.5"
              style={{
                background: "var(--secondary)",
                color: "var(--muted-foreground)",
                boxShadow: "0 2px 12px oklch(0 0 0 / 0.3)",
              }}
            >
              Log workout
            </button>
            <p className="text-[11px] text-muted-foreground/40">
              Or complete all exercises + cardio to auto-log
            </p>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
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
