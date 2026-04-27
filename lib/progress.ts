import { supabase } from "./supabase"
import type { DayEntry } from "./types"

// ─── Row types (mirror Supabase schema) ──────────────────────────────────────

export interface UserProgressRow {
  user_id:        string
  start_date:     string          // "YYYY-MM-DD"
  start_weight:   number
  goal_weight:    number
  height_cm:      number | null
  age_years:      number | null
  sex:            "M" | "F" | null
  calorie_target: number
  protein_target: number
  updated_at:     string
}

// ─── BMR / TDEE helpers ───────────────────────────────────────────────────────

/** Mifflin-St Jeor BMR (kcal/day). Requires weight kg, height cm, age years. */
export function calcBMR(
  weightKg: number,
  heightCm: number,
  age:      number,
  sex:      "M" | "F"
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === "M" ? base + 5 : base - 161)
}

export const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light:     "Light",
  moderate:  "Moderate",
  active:    "Active",
} as const

export type ActivityLevel = keyof typeof ACTIVITY_LABELS

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725,
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

/** Recommended daily protein in grams: 2 g per kg of goal weight. */
export function calcProteinTarget(goalWeightKg: number): number {
  return Math.round(goalWeightKg * 2)
}

export interface DailyLogRow {
  user_id:      string
  day:          number
  log_date:     string           // "YYYY-MM-DD"
  workout_done: boolean
  calories:     number | null
  protein:      number | null
  weight:       number | null
  completed:    boolean
}

// ─── Day / date helpers ───────────────────────────────────────────────────────

/** Compute 1-indexed current day from start_date. Clamped to [1, 90]. */
export function calcCurrentDay(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  // Zero out time for pure date diff
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  return Math.min(Math.max(diff + 1, 1), 90)
}

/** Convert 1-indexed day number back to a calendar date. */
export function dayToDate(startDate: string, day: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + day - 1)
  return d.toISOString().split("T")[0]
}

/** Today as "YYYY-MM-DD". */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0]
}

// ─── Streak calculation ───────────────────────────────────────────────────────

/**
 * Count consecutive completed days ending at (and including) currentDay.
 * If today is not yet completed, only count the streak up to yesterday.
 */
export function calcStreak(
  entries: Record<number, DayEntry>,
  currentDay: number
): number {
  let streak = 0
  for (let d = currentDay; d >= 1; d--) {
    if (entries[d]?.completed) streak++
    else break
  }
  return streak
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

export async function fetchUserProgress(
  userId: string
): Promise<UserProgressRow | null> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error || !data) return null
  return data as UserProgressRow
}

export async function createUserProgress(row: UserProgressRow): Promise<void> {
  const { error } = await supabase
    .from("user_progress")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(row as any)

  if (error) throw new Error(`Failed to create user_progress: ${error.message}`)
}

export async function updateUserProgress(
  userId: string,
  update: Partial<Omit<UserProgressRow, "user_id">>
): Promise<void> {
  await supabase
    .from("user_progress")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ ...update, updated_at: new Date().toISOString() } as any)
    .eq("user_id", userId)
}

export async function fetchDailyLogs(userId: string): Promise<DailyLogRow[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .order("day", { ascending: true })

  if (error || !data) return []
  return data as DailyLogRow[]
}

export async function upsertDailyLog(row: DailyLogRow): Promise<void> {
  await supabase
    .from("daily_logs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ ...row as any, updated_at: new Date().toISOString() }, {
      onConflict: "user_id,day",
    })
}

// ─── Conversions ─────────────────────────────────────────────────────────────

/** Convert daily_logs rows → entries record keyed by day. */
export function logsToEntries(logs: DailyLogRow[]): Record<number, DayEntry> {
  const entries: Record<number, DayEntry> = {}
  for (const log of logs) {
    entries[log.day] = {
      day:         log.day,
      workoutDone: log.workout_done,
      calories:    log.calories,
      protein:     log.protein,
      weight:      log.weight,
      completed:   log.completed,
    }
  }
  return entries
}

/** Convert a DayEntry back to a DailyLogRow for upserting. */
export function entryToLog(
  userId: string,
  startDate: string,
  entry: DayEntry
): DailyLogRow {
  return {
    user_id:      userId,
    day:          entry.day,
    log_date:     dayToDate(startDate, entry.day),
    workout_done: entry.workoutDone,
    calories:     entry.calories,
    protein:      entry.protein,
    weight:       entry.weight,
    completed:    entry.completed,
  }
}
