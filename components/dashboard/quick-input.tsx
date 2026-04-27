"use client"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

// ─── Live feedback line ───────────────────────────────────────────────────────

function FeedbackLine({ text, color }: { text: string; color: string }) {
  return (
    <p className="text-[11px] transition-all duration-300" style={{ color }}>
      {text}
    </p>
  )
}

function MicroBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-[2px] rounded-full bg-border overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  )
}

// ─── Calorie feedback ─────────────────────────────────────────────────────────

function calorieFeedback(
  calories: number | null,
  staging: string,
  target: number
): { text: string; color: string; pct: number } | null {
  const val = staging !== "" ? Number(staging) : calories
  if (val === null) return null
  const remaining = target - val
  const pct = (val / target) * 100

  if (remaining > 200)
    return { text: `${remaining} kcal remaining`, color: "var(--muted-foreground)", pct }
  if (remaining >= 0)
    return { text: `${remaining} kcal to target — almost there`, color: "var(--success)", pct }
  return { text: `${Math.abs(remaining)} kcal over target`, color: "var(--missed)", pct }
}

// ─── Protein feedback ────────────────────────────────────────────────────────

function proteinFeedback(
  protein: number | null,
  staging: string,
  target: number
): { text: string; color: string; pct: number } | null {
  const val = staging !== "" ? Number(staging) : protein
  if (val === null) return null
  const gap = target - val
  const pct = (val / target) * 100

  if (gap > 20)
    return { text: `+${gap}g to reach target`, color: "var(--muted-foreground)", pct }
  if (gap > 0)
    return { text: `${gap}g to target — nearly there`, color: "var(--success)", pct }
  return { text: `Protein target reached ✓`, color: "var(--success)", pct }
}

// ─── Inline input ─────────────────────────────────────────────────────────────

interface InlineInputProps {
  label: string
  unit: string
  value: string
  placeholder: string
  onChange: (v: string) => void
  onSave: () => void
  feedback?: { text: string; color: string; pct: number } | null
  min?: number
  max?: number
}

function InlineInput({
  label, unit, value, placeholder, onChange, onSave, feedback, min, max,
}: InlineInputProps) {
  return (
    <div className="flex flex-col py-3.5 border-b border-border last:border-0 gap-2 group">
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground group-focus-within:text-foreground transition-colors duration-200">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            placeholder={placeholder}
            min={min}
            max={max}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            onBlur={onSave}
            className={cn(
              "w-20 bg-transparent text-right text-sm font-medium text-foreground",
              "placeholder:text-muted-foreground/40",
              "focus:outline-none tabular-nums",
              "[&::-webkit-outer-spin-button]:appearance-none",
              "[&::-webkit-inner-spin-button]:appearance-none",
            )}
          />
          <span className="text-xs text-muted-foreground w-5">{unit}</span>
        </div>
      </div>

      {/* Live feedback */}
      {feedback && (
        <div className="flex flex-col gap-1">
          <FeedbackLine text={feedback.text} color={feedback.color} />
          <MicroBar pct={feedback.pct} color={feedback.color} />
        </div>
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickInput() {
  const currentDay        = useStore((s) => s.currentDay)
  const stagingCalories   = useStore((s) => s.stagingCalories)
  const stagingProtein    = useStore((s) => s.stagingProtein)
  const stagingWeight     = useStore((s) => s.stagingWeight)
  const setStagingCalories = useStore((s) => s.setStagingCalories)
  const setStagingProtein  = useStore((s) => s.setStagingProtein)
  const setStagingWeight   = useStore((s) => s.setStagingWeight)
  const commitStaging      = useStore((s) => s.commitStaging)
  const calorieTarget      = useStore((s) => s.calorieTarget)
  const proteinTarget      = useStore((s) => s.proteinTarget)
  const entry              = useStore((s) => s.entries[currentDay])

  const displayCalories = stagingCalories !== "" ? stagingCalories : (entry?.calories?.toString() ?? "")
  const displayProtein  = stagingProtein  !== "" ? stagingProtein  : (entry?.protein?.toString()  ?? "")
  const displayWeight   = stagingWeight   !== "" ? stagingWeight   : (entry?.weight?.toString()   ?? "")

  function handleSave() {
    if (stagingCalories !== "" || stagingProtein !== "" || stagingWeight !== "") {
      commitStaging(currentDay)
    }
  }

  const calFeedback  = calorieFeedback(entry?.calories ?? null, stagingCalories, calorieTarget)
  const protFeedback = proteinFeedback(entry?.protein  ?? null, stagingProtein,  proteinTarget)

  return (
    <section className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground tracking-wide uppercase mb-2">Log today</p>

      <InlineInput
        label="Calories"
        unit="kcal"
        value={displayCalories}
        placeholder="—"
        onChange={setStagingCalories}
        onSave={handleSave}
        feedback={calFeedback}
        min={0}
        max={9999}
      />
      <InlineInput
        label="Protein"
        unit="g"
        value={displayProtein}
        placeholder="—"
        onChange={setStagingProtein}
        onSave={handleSave}
        feedback={protFeedback}
        min={0}
        max={500}
      />
      <InlineInput
        label="Weight"
        unit="kg"
        value={displayWeight}
        placeholder="—"
        onChange={setStagingWeight}
        onSave={handleSave}
        min={30}
        max={300}
      />
    </section>
  )
}
