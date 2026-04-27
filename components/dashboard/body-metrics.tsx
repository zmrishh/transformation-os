"use client"

import { TrendingDownIcon, TrendingUpIcon, MinusIcon } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart } from "recharts"
import { useStore, useWeightHistory } from "@/lib/store"

// ─── Weekly stats ─────────────────────────────────────────────────────────────

function getWeeklyStats(
  history: Array<{ day: number; weight: number }>,
  currentDay: number
): { avg: number; min: number; count: number } | null {
  const weekEntries = history.filter((e) => e.day >= currentDay - 7 && e.day <= currentDay)
  if (weekEntries.length === 0) return null
  const weights = weekEntries.map((e) => e.weight)
  return {
    avg:   +( weights.reduce((s, w) => s + w, 0) / weights.length ).toFixed(1),
    min:   +Math.min(...weights).toFixed(1),
    count: weekEntries.length,
  }
}

// ─── Lowest-in-X-days ────────────────────────────────────────────────────────

function getLowestLabel(
  history: Array<{ day: number; weight: number }>,
  latest: number,
  currentDay: number
): string | null {
  const olderHigher = history.filter((e) => e.day < currentDay - 1 && e.weight > latest)
  if (olderHigher.length === 0) return "All-time low 🎉"
  const lastHigher = olderHigher[olderHigher.length - 1]
  const daysDiff = currentDay - lastHigher.day
  if (daysDiff < 3) return null
  return `Lowest in ${daysDiff} days`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BodyMetrics() {
  const startWeight = useStore((s) => s.startWeight)
  const goalWeight  = useStore((s) => s.goalWeight)
  const currentDay  = useStore((s) => s.currentDay)

  const history  = useWeightHistory()
  const latest   = history[history.length - 1]?.weight ?? startWeight
  const previous = history[history.length - 2]?.weight ?? null

  const delta     = previous !== null ? +(latest - previous).toFixed(1) : null
  const totalLost = +(startWeight - latest).toFixed(1)

  const TrendIcon =
    delta === null ? MinusIcon
    : delta < 0   ? TrendingDownIcon
    : delta > 0   ? TrendingUpIcon
    : MinusIcon

  const trendColor =
    delta === null    ? "var(--muted-foreground)"
    : delta <= 0      ? "var(--success)"
    : "var(--missed)"

  const chartData   = history.map((e) => ({ day: e.day, weight: e.weight }))
  const chartConfig = { weight: { label: "Weight", color: "var(--success)" } }

  const weeklyStats = getWeeklyStats(history, currentDay)
  const lowestLabel = history.length > 0 ? getLowestLabel(history, latest, currentDay) : null

  return (
    <section className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground tracking-wide uppercase">Body weight</p>

      {/* Main row: number + delta + emotional label */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <span
            key={latest}
            className="number-pop text-5xl font-bold tracking-tight text-foreground"
          >
            {latest}
          </span>
          <span className="text-lg text-muted-foreground ml-1.5">kg</span>
        </div>

        <div className="flex flex-col gap-1 mb-0.5">
          {delta !== null && (
            <div
              className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
              style={{
                background: delta <= 0 ? "var(--success-muted)" : "var(--missed-muted)",
                color: trendColor,
              }}
            >
              <TrendIcon className="size-3.5" />
              {delta > 0 ? "+" : ""}{delta} kg
            </div>
          )}
          {lowestLabel && (
            <span
              className="text-[11px] pl-1"
              style={{ color: "var(--success)" }}
            >
              {lowestLabel}
            </span>
          )}
        </div>
      </div>

      {/* Area chart */}
      {chartData.length > 1 && (
        <ChartContainer config={chartConfig} className="h-20 w-full">
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--success)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="weight"
              stroke="var(--success)"
              strokeWidth={1.5}
              fill="url(#weightGradient)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "var(--success)" }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(v) => [`${v} kg`, "Weight"]}
                  labelFormatter={(_, p) => `Day ${p[0]?.payload?.day}`}
                />
              }
            />
          </AreaChart>
        </ChartContainer>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
        <span>
          Start: <span className="text-foreground/70 font-medium">{startWeight} kg</span>
        </span>
        <span>
          Goal: <span className="text-foreground/70 font-medium">{goalWeight} kg</span>
        </span>
        {totalLost > 0 && (
          <span style={{ color: "var(--success)" }}>↓ {totalLost} kg total</span>
        )}
        {weeklyStats && weeklyStats.count >= 2 && (
          <span>
            7-day avg:{" "}
            <span className="text-foreground/70 font-medium">{weeklyStats.avg} kg</span>
          </span>
        )}
      </div>
    </section>
  )
}
