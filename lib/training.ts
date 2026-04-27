// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string
  name: string
  defaultSets: number
  defaultReps: string   // e.g. "10–12" or "to failure"
  tip?: string
}

export interface MuscleGroup {
  name: string
  exercises: Exercise[]
}

export interface Split {
  index: number
  name: string          // "Chest + Triceps"
  focus: string         // coach cue shown below split name
  groups: MuscleGroup[]
}

export interface CardioOption {
  id: string
  name: string
  detail: string
}

export interface ExerciseLog {
  sets: number
  reps: string
  weight: string        // empty = not entered
  done: boolean
}

export interface WorkoutSession {
  splitIndex: number
  exercises: Record<string, ExerciseLog>   // exerciseId → log
  selectedCardio: string | null
  cardioDone: boolean
}

// ─── Split data ───────────────────────────────────────────────────────────────

export const SPLITS: Split[] = [
  {
    index: 0,
    name: "Chest + Triceps",
    focus: "Controlled reps. Full stretch at the bottom.",
    groups: [
      {
        name: "Chest",
        exercises: [
          { id: "incline-db-press",  name: "Incline Dumbbell Press", defaultSets: 4, defaultReps: "8–10" },
          { id: "flat-bench-press",  name: "Flat Bench Press",       defaultSets: 3, defaultReps: "10–12" },
          { id: "cable-fly",         name: "Cable Fly",              defaultSets: 3, defaultReps: "12–15", tip: "Squeeze hard at the peak" },
        ],
      },
      {
        name: "Triceps",
        exercises: [
          { id: "tricep-pushdown",   name: "Tricep Pushdown",        defaultSets: 3, defaultReps: "12–15" },
          { id: "overhead-ext",      name: "Overhead Extension",     defaultSets: 3, defaultReps: "10–12" },
          { id: "dips",              name: "Dips",                   defaultSets: 3, defaultReps: "to failure" },
        ],
      },
    ],
  },
  {
    index: 1,
    name: "Back + Biceps",
    focus: "Pull from the lats. Keep elbows close.",
    groups: [
      {
        name: "Back",
        exercises: [
          { id: "deadlift",          name: "Deadlift",               defaultSets: 3, defaultReps: "6–8",   tip: "Bar stays over mid-foot throughout" },
          { id: "barbell-row",       name: "Barbell Row",            defaultSets: 3, defaultReps: "8–10" },
          { id: "lat-pulldown",      name: "Lat Pulldown",           defaultSets: 3, defaultReps: "10–12" },
          { id: "cable-row",         name: "Seated Cable Row",       defaultSets: 3, defaultReps: "12" },
        ],
      },
      {
        name: "Biceps",
        exercises: [
          { id: "barbell-curl",      name: "Barbell Curl",           defaultSets: 3, defaultReps: "10–12" },
          { id: "hammer-curl",       name: "Hammer Curl",            defaultSets: 3, defaultReps: "12–15" },
          { id: "incline-curl",      name: "Incline Dumbbell Curl",  defaultSets: 3, defaultReps: "10–12", tip: "Full stretch — don't shorten the range" },
        ],
      },
    ],
  },
  {
    index: 2,
    name: "Legs + Shoulders",
    focus: "Drive through the heels. Brace your core.",
    groups: [
      {
        name: "Legs",
        exercises: [
          { id: "squat",             name: "Barbell Squat",          defaultSets: 4, defaultReps: "6–8",   tip: "Break parallel" },
          { id: "rdl",               name: "Romanian Deadlift",      defaultSets: 3, defaultReps: "10–12" },
          { id: "leg-press",         name: "Leg Press",              defaultSets: 3, defaultReps: "12–15" },
        ],
      },
      {
        name: "Shoulders",
        exercises: [
          { id: "ohp",               name: "Overhead Press",         defaultSets: 4, defaultReps: "8–10" },
          { id: "lateral-raise",     name: "Lateral Raise",          defaultSets: 4, defaultReps: "12–15", tip: "Lead with the elbow, not the wrist" },
          { id: "face-pull",         name: "Face Pull",              defaultSets: 3, defaultReps: "15" },
        ],
      },
    ],
  },
]

export const CARDIO_OPTIONS: CardioOption[] = [
  { id: "treadmill",     name: "Treadmill",     detail: "6 km/h · incline 5–8%" },
  { id: "cycling",       name: "Cycling",       detail: "Moderate resistance · 80–90 RPM" },
  { id: "stair-climber", name: "Stair Climber", detail: "Medium pace · steady state" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSplitForDay(day: number): Split {
  return SPLITS[(day - 1) % SPLITS.length]
}

export function getTotalExercises(split: Split): number {
  return split.groups.reduce((sum, g) => sum + g.exercises.length, 0)
}

export function makeDefaultLog(exercise: Exercise): ExerciseLog {
  return {
    sets:   exercise.defaultSets,
    reps:   exercise.defaultReps,
    weight: "",
    done:   false,
  }
}

/** Count how many previous sessions used a given split (excludes current day). */
export function countPastSessions(
  sessions: Record<number, WorkoutSession>,
  splitIndex: number,
  currentDay: number
): number {
  return Object.entries(sessions).filter(
    ([day, s]) => Number(day) < currentDay && s.splitIndex === splitIndex
  ).length
}

/** Find the most recent past session for this split before today. */
export function lastSession(
  sessions: Record<number, WorkoutSession>,
  splitIndex: number,
  currentDay: number
): { day: number; session: WorkoutSession } | null {
  const past = Object.entries(sessions)
    .filter(([day, s]) => Number(day) < currentDay && s.splitIndex === splitIndex)
    .sort(([a], [b]) => Number(b) - Number(a))
  if (past.length === 0) return null
  const [day, session] = past[0]
  return { day: Number(day), session }
}
