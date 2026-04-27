"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, useCurrentEntry } from "@/lib/store"

export function CompleteButton() {
  const [pressed, setPressed] = useState(false)
  const { entry, currentDay, calorieTarget } = useCurrentEntry()
  const completeDay = useStore((s) => s.completeDay)

  const workoutDone = entry?.workoutDone ?? false
  const caloriesLogged = entry?.calories !== null && entry?.calories !== undefined
  const isCompleted = entry?.completed ?? false

  const canComplete = workoutDone && caloriesLogged
  const missingItems: string[] = []
  if (!workoutDone) missingItems.push("log your workout")
  if (!caloriesLogged) missingItems.push("log calories")

  function handleComplete() {
    if (!canComplete || isCompleted) return
    setPressed(true)
    completeDay(currentDay)
    setTimeout(() => setPressed(false), 600)
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-medium tracking-wide"
          style={{
            background: "var(--success-muted)",
            color: "var(--success)",
          }}
        >
          <CheckIcon className="size-4" />
          Day {currentDay} complete
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleComplete}
        disabled={!canComplete}
        className={cn(
          "relative rounded-full px-12 py-4 text-base font-medium tracking-wide",
          "transition-all duration-200 select-none",
          "active:scale-[0.96]",
          canComplete
            ? "bg-primary text-primary-foreground shadow-[0_4px_24px_oklch(0_0_0/0.5)] hover:shadow-[0_6px_32px_oklch(0_0_0/0.6)] hover:-translate-y-0.5"
            : "bg-secondary text-muted-foreground cursor-not-allowed",
          pressed && "scale-[0.96]"
        )}
      >
        Complete Today
      </button>

      {missingItems.length > 0 && (
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {missingItems.length === 1
            ? `First, ${missingItems[0]}`
            : `First, ${missingItems[0]} and ${missingItems[1]}`}
        </p>
      )}
    </div>
  )
}
