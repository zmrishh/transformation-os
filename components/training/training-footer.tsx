"use client"

import { useStore } from "@/lib/store"
import { countPastSessions, lastSession } from "@/lib/training"
import type { Split } from "@/lib/training"

interface TrainingFooterProps {
  split: Split
  currentDay: number
}

export function TrainingFooter({ split, currentDay }: TrainingFooterProps) {
  const workoutSessions = useStore((s) => s.workoutSessions)

  const pastCount = countPastSessions(workoutSessions, split.index, currentDay)
  const last      = lastSession(workoutSessions, split.index, currentDay)

  // Find any weight logged in the last session's main lift (first exercise of first group)
  const mainLiftId    = split.groups[0].exercises[0].id
  const lastWeight    = last?.session.exercises[mainLiftId]?.weight
  const lastWeightNum = lastWeight ? Number(lastWeight) : null

  return (
    <section className="flex flex-col gap-3 pt-2 pb-4">
      {/* Progression notes — only shown if there's history */}
      {pastCount > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            You&apos;ve done{" "}
            <span className="text-foreground/70 font-medium">{split.name}</span>
            {" "}{pastCount} time{pastCount !== 1 ? "s" : ""}
          </p>
          {last && lastWeightNum && lastWeightNum > 0 && (
            <p className="text-xs text-muted-foreground">
              Last session:{" "}
              <span className="text-foreground/70 font-medium">
                {lastWeightNum} kg on {split.groups[0].exercises[0].name}
              </span>{" "}
              <span className="opacity-60">· Day {last.day}</span>
            </p>
          )}
        </div>
      )}

      {/* Consistency note — always shown */}
      <p className="text-xs text-muted-foreground/40 select-none">
        Consistency &gt; intensity
      </p>
    </section>
  )
}
