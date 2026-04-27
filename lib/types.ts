export type WorkoutType = "both" | "muscle" | "cardio"

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  both:    "Muscle + Cardio",
  muscle:  "Muscle only",
  cardio:  "Cardio only",
}

export interface DayEntry {
  day:         number
  workoutDone: boolean
  workoutType: WorkoutType | null
  calories:    number | null
  protein:     number | null
  weight:      number | null
  completed:   boolean
}

export type DayStatus = "completed" | "missed" | "future" | "today"

export function getDayStatus(
  entry: DayEntry | undefined,
  day: number,
  currentDay: number
): DayStatus {
  if (day > currentDay) return "future"
  if (day === currentDay) return "today"
  if (!entry) return "missed"
  if (entry.completed) return "completed"
  return "missed"
}
