"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Tip {
  title:  string
  detail: string
}

const TIPS: Tip[] = [
  {
    title:  "Walk after every meal",
    detail: "10–15 min post-meal walks can reduce blood glucose spikes by up to 30%. No gym required.",
  },
  {
    title:  "Eat protein and fat first",
    detail: "Starting meals with protein or fat before carbs slows glucose absorption and blunts insulin spikes.",
  },
  {
    title:  "Prioritise resistance training",
    detail: "Muscle is the largest glucose disposal site. 3× per week lifting significantly improves insulin sensitivity within 4 weeks.",
  },
  {
    title:  "Sleep 7–9 hours",
    detail: "A single night of 4–5 h sleep can reduce insulin sensitivity by 25%. Sleep is not optional recovery.",
  },
  {
    title:  "Cut liquid sugar completely",
    detail: "Juice, soda, and sweetened coffee bypass satiety signals and spike insulin with zero fibre buffer.",
  },
  {
    title:  "Time-restrict your eating window",
    detail: "A 14:10 or 16:8 eating window reduces insulin exposure overnight and improves morning fasting glucose.",
  },
  {
    title:  "Add soluble fibre to every meal",
    detail: "Oats, legumes, and vegetables slow carb digestion, reducing the insulin response by 20–40%.",
  },
  {
    title:  "Manage cortisol (stress)",
    detail: "Chronic stress elevates cortisol which directly triggers gluconeogenesis. Breathwork, sunlight, and cold exposure all help.",
  },
  {
    title:  "Ground cinnamon daily",
    detail: "0.5–2 g of Ceylon cinnamon per day has shown modest but consistent reduction in fasting glucose in clinical trials.",
  },
  {
    title:  "Stay out of the chair",
    detail: "Sitting for > 90 min continuously halts glucose clearance. Set a timer — stand, stretch, or walk briefly every hour.",
  },
]

export function InsulinTips() {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground tracking-wide uppercase">
          Insulin Resistance Tips
        </p>
        <span className="text-[10px] text-muted-foreground/40">{TIPS.length} practices</span>
      </div>

      <div className="flex flex-col">
        {TIPS.map((tip, i) => {
          const isOpen = expanded === i
          return (
            <button
              key={tip.title}
              onClick={() => setExpanded(isOpen ? null : i)}
              className={cn(
                "text-left flex flex-col py-3.5",
                "border-b border-border last:border-0",
                "transition-all duration-150 active:scale-[0.99] focus-visible:outline-none",
              )}
            >
              {/* Title row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {/* Subtle index dot */}
                  <span
                    className="text-[10px] tabular-nums text-muted-foreground/30 w-4 flex-shrink-0 select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium text-foreground leading-snug">
                    {tip.title}
                  </span>
                </div>
                {/* Chevron */}
                <span
                  className="text-muted-foreground/30 flex-shrink-0 transition-transform duration-200 select-none"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ↓
                </span>
              </div>

              {/* Expandable detail */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: isOpen ? "120px" : "0px", opacity: isOpen ? 1 : 0 }}
              >
                <p className="pl-[26px] pt-2 text-xs leading-relaxed text-muted-foreground pr-6">
                  {tip.detail}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
