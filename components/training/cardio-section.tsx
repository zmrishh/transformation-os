"use client"

import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { CARDIO_OPTIONS } from "@/lib/training"

interface CardioSectionProps {
  day: number
  selectedCardio: string | null
  cardioDone: boolean
}

export function CardioSection({ day, selectedCardio, cardioDone }: CardioSectionProps) {
  const selectCardio  = useStore((s) => s.selectCardio)
  const setCardioDone = useStore((s) => s.setCardioDone)

  const chosen = CARDIO_OPTIONS.find((c) => c.id === selectedCardio) ?? null

  return (
    <section className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cardio</h2>
          <p className="text-xs text-muted-foreground mt-0.5">60 min · pick one</p>
        </div>
        {cardioDone && (
          <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
            Done ✓
          </span>
        )}
      </div>

      {/* Option pills */}
      <div className="flex flex-wrap gap-2">
        {CARDIO_OPTIONS.map((opt) => {
          const isSelected = selectedCardio === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => selectCardio(day, opt.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.96]",
              )}
              style={{
                background: isSelected ? "var(--primary)" : "var(--secondary)",
                color:      isSelected ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              {opt.name}
            </button>
          )
        })}
      </div>

      {/* Detail + done toggle */}
      {chosen && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            chosen ? "max-h-24" : "max-h-0",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{chosen.detail}</p>

            <button
              onClick={() => setCardioDone(day, !cardioDone)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium",
                "transition-all duration-200 active:scale-95",
              )}
              style={{
                background: cardioDone ? "var(--success-muted)" : "var(--secondary)",
                color:      cardioDone ? "var(--success)"       : "var(--muted-foreground)",
              }}
            >
              {cardioDone ? (
                <><CheckIcon className="size-3" /> Completed</>
              ) : (
                "Mark complete"
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
