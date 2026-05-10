"use client"

import { useState } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useStore } from "@/lib/store"
import { getDayStatus, type DayStatus, type DayEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

const BAR_HEIGHT = 32
const BAR_WIDTH = 5

function barColor(status: DayStatus): string {
  switch (status) {
    case "completed": return "var(--success)"
    case "missed":    return "var(--missed)"
    case "today":     return "var(--primary)"
    case "future":    return "var(--streak-future)"
  }
}

function getCurrentStreak(entries: Record<number, DayEntry>, currentDay: number): number {
  let streak = 0
  for (let day = currentDay - 1; day >= 1; day--) {
    if (entries[day]?.completed) streak++
    else break
  }
  return streak
}

function buildHoverInfo(entry: DayEntry | undefined, day: number, status: DayStatus): string {
  if (status === "future") return `Day ${day} — upcoming`
  if (status === "today")  return `Day ${day} — today`
  if (!entry || status === "missed") return `Day ${day} — missed`
  const parts: string[] = [`Day ${day} — completed`]
  if (entry.calories !== null) parts.push(`${entry.calories} kcal`)
  if (entry.protein  !== null) parts.push(`${entry.protein}g protein`)
  if (entry.workoutDone)       parts.push("workout ✓")
  return parts.join(" · ")
}

export function StreakTimeline() {
  const totalDays  = useStore((s) => s.totalDays)
  const currentDay = useStore((s) => s.currentDay)
  const entries    = useStore((s) => s.entries)

  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const completedCount = Object.values(entries).filter((e) => e.completed).length
  const missedCount    = Object.values(entries).filter((e) => !e.completed && e.day < currentDay).length
  const currentStreak  = getCurrentStreak(entries, currentDay)

  const hoveredStatus = hoveredDay ? getDayStatus(entries[hoveredDay], hoveredDay, currentDay) : null
  const hoverInfo     = hoveredDay && hoveredStatus
    ? buildHoverInfo(entries[hoveredDay], hoveredDay, hoveredStatus)
    : null

  return (
    <section className="flex flex-col gap-4">
      {/* Label row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground tracking-wide uppercase">
          100-day streak
          </span>
          {currentStreak > 0 && (
            <span className="text-[11px]" style={{ color: "var(--success)" }}>
              {currentStreak} day{currentStreak !== 1 ? "s" : ""} in a row
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full" style={{ background: "var(--success)" }} />
            {completedCount} done
          </span>
          {missedCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full" style={{ background: "var(--missed)" }} />
              {missedCount} missed
            </span>
          )}
        </div>
      </div>

      {/* Hover info line */}
      <div className="h-4 px-1">
        {hoverInfo && (
          <p className="text-[11px] text-muted-foreground/80 transition-opacity duration-150">
            {hoverInfo}
          </p>
        )}
      </div>

      {/* Bar strip */}
      <ScrollArea className="w-full">
        <div className="flex items-end gap-[3px] py-1 px-1 w-max">
          {Array.from({ length: totalDays }, (_, i) => {
            const day    = i + 1
            const status = getDayStatus(entries[day], day, currentDay)
            const isToday = status === "today"

            return (
              <div
                key={day}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={cn(
                  "rounded-full flex-shrink-0 cursor-default",
                  "transition-opacity duration-150",
                  hoveredDay !== null && hoveredDay !== day ? "opacity-40" : "",
                  isToday && "animate-pulse"
                )}
                style={{
                  width: `${BAR_WIDTH}px`,
                  height: `${BAR_HEIGHT}px`,
                  background: barColor(status),
                  transformOrigin: "bottom",
                  animation: isToday
                    ? undefined
                    : `barRise 400ms cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 7, 320)}ms both`,
                }}
              />
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="opacity-0" />
      </ScrollArea>
    </section>
  )
}
