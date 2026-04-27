"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"
import type { DayEntry } from "./types"
import type { WorkoutSession, ExerciseLog } from "./training"
import { ensureAuth } from "./supabase"
import {
  calcCurrentDay,
  todayISO,
  fetchUserProgress,
  createUserProgress,
  updateUserProgress,
  fetchDailyLogs,
  upsertDailyLog,
  logsToEntries,
  entryToLog,
  type UserProgressRow,
} from "./progress"

export interface CreateProfileParams {
  startWeight:   number
  goalWeight:    number
  heightCm:      number | null
  ageYears:      number | null
  sex:           "M" | "F" | null
  calorieTarget: number
  proteinTarget: number
}

const TOTAL_DAYS     = 90
const CAL_TARGET     = 2100
const PROTEIN_TARGET = 160

// ─── Store interface ──────────────────────────────────────────────────────────

interface TransformationStore {
  // Lifecycle
  isLoading:       boolean
  isInitialized:   boolean
  needsOnboarding: boolean

  // Identity
  userId:    string | null
  startDate: string | null   // "YYYY-MM-DD"

  // Config
  totalDays:      number
  currentDay:     number
  startWeight:    number
  goalWeight:     number
  calorieTarget:  number
  proteinTarget:  number

  // Per-day data
  entries: Record<number, DayEntry>

  // Training sessions (exercise-level detail — local only, no cross-device sync needed)
  workoutSessions: Record<number, WorkoutSession>

  // Quick-input staging (not persisted — ephemeral between saves)
  stagingCalories: string
  stagingProtein:  string
  stagingWeight:   string

  // Lifecycle actions
  initialize:    () => Promise<void>
  createProfile: (params: CreateProfileParams) => Promise<void>

  // Day actions
  logWorkout:          (day: number) => void
  setStagingCalories:  (val: string) => void
  setStagingProtein:   (val: string) => void
  setStagingWeight:    (val: string) => void
  commitStaging:       (day: number) => void
  completeDay:         (day: number) => void

  // Training actions
  initWorkoutSession: (day: number, splitIndex: number) => void
  setExerciseLog:     (day: number, exerciseId: string, update: Partial<ExerciseLog>) => void
  selectCardio:       (day: number, cardioId: string) => void
  setCardioDone:      (day: number, done: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<TransformationStore>()(
  persist(
    (set, get) => ({
      // ── Lifecycle ─────────────────────────────────────────────────────
      isLoading:       false,
      isInitialized:   false,
      needsOnboarding: false,

      // ── Identity ──────────────────────────────────────────────────────
      userId:    null,
      startDate: null,

      // ── Config (defaults — overwritten on init) ───────────────────────
      totalDays:     TOTAL_DAYS,
      currentDay:    1,
      startWeight:   90,
      goalWeight:    75,
      calorieTarget: CAL_TARGET,
      proteinTarget: PROTEIN_TARGET,

      // ── Per-day data ──────────────────────────────────────────────────
      entries: {},

      // ── Training ──────────────────────────────────────────────────────
      workoutSessions: {},

      // ── Staging ───────────────────────────────────────────────────────
      stagingCalories: "",
      stagingProtein:  "",
      stagingWeight:   "",

      // ── initialize ────────────────────────────────────────────────────
      initialize: async () => {
        set({ isLoading: true })

        try {
          const userId = await ensureAuth()
          if (!userId) throw new Error("Could not establish user identity")

          const progress = await fetchUserProgress(userId)

          if (!progress) {
            // First visit — show onboarding
            set({ isLoading: false, needsOnboarding: true, userId })
            return
          }

          const currentDay = calcCurrentDay(progress.start_date)
          const logs       = await fetchDailyLogs(userId)
          const entries    = logsToEntries(logs)

          set({
            isLoading:       false,
            isInitialized:   true,
            needsOnboarding: false,
            userId,
            startDate:     progress.start_date,
            currentDay,
            startWeight:   progress.start_weight,
            goalWeight:    progress.goal_weight,
            calorieTarget: progress.calorie_target,
            proteinTarget: progress.protein_target,
            entries,
          })
        } catch (err) {
          console.error("[store] initialize failed, using local state:", err)
          // Graceful degradation — use whatever is in persisted local state
          set({ isLoading: false, isInitialized: true })
        }
      },

      // ── createProfile (called from onboarding) ────────────────────────
      createProfile: async ({
        startWeight,
        goalWeight,
        heightCm,
        ageYears,
        sex,
        calorieTarget,
        proteinTarget,
      }) => {
        const userId    = await ensureAuth()
        const startDate = todayISO()

        const row: UserProgressRow = {
          user_id:        userId,
          start_date:     startDate,
          start_weight:   startWeight,
          goal_weight:    goalWeight,
          height_cm:      heightCm,
          age_years:      ageYears,
          sex,
          calorie_target: calorieTarget,
          protein_target: proteinTarget,
          updated_at:     new Date().toISOString(),
        }

        await createUserProgress(row)

        set({
          needsOnboarding: false,
          isInitialized:   true,
          userId,
          startDate,
          currentDay:    1,
          startWeight,
          goalWeight,
          calorieTarget,
          proteinTarget,
          entries:       {},
        })
      },

      // ── Day actions ───────────────────────────────────────────────────

      logWorkout: (day) => {
        set((state) => {
          const prev = state.entries[day] ?? emptyEntry(day)
          const updated = { ...prev, workoutDone: true }
          syncEntry(state, updated)
          return { entries: { ...state.entries, [day]: updated } }
        })
      },

      setStagingCalories: (val) => set({ stagingCalories: val }),
      setStagingProtein:  (val) => set({ stagingProtein: val }),
      setStagingWeight:   (val) => set({ stagingWeight: val }),

      commitStaging: (day) => {
        const { stagingCalories, stagingProtein, stagingWeight } = get()
        set((state) => {
          const prev = state.entries[day] ?? emptyEntry(day)
          const updated: DayEntry = {
            ...prev,
            calories: stagingCalories !== "" ? Number(stagingCalories) : prev.calories,
            protein:  stagingProtein  !== "" ? Number(stagingProtein)  : prev.protein,
            weight:   stagingWeight   !== "" ? Number(stagingWeight)   : prev.weight,
          }
          syncEntry(state, updated)
          return {
            entries:         { ...state.entries, [day]: updated },
            stagingCalories: "",
            stagingProtein:  "",
            stagingWeight:   "",
          }
        })
      },

      completeDay: (day) => {
        set((state) => {
          const entry = state.entries[day]
          if (!entry?.workoutDone || entry.calories === null) return state
          const updated = { ...entry, completed: true }
          syncEntry(state, updated)
          return { entries: { ...state.entries, [day]: updated } }
        })
      },

      // ── Training actions ──────────────────────────────────────────────

      initWorkoutSession: (day, splitIndex) =>
        set((state) => {
          if (state.workoutSessions[day]) return state
          return {
            workoutSessions: {
              ...state.workoutSessions,
              [day]: { splitIndex, exercises: {}, selectedCardio: null, cardioDone: false },
            },
          }
        }),

      setExerciseLog: (day, exerciseId, update) =>
        set((state) => {
          const session = state.workoutSessions[day]
          if (!session) return state
          const prev = session.exercises[exerciseId] ?? {
            sets: 3, reps: "10–12", weight: "", done: false,
          }
          return {
            workoutSessions: {
              ...state.workoutSessions,
              [day]: {
                ...session,
                exercises: { ...session.exercises, [exerciseId]: { ...prev, ...update } },
              },
            },
          }
        }),

      selectCardio: (day, cardioId) =>
        set((state) => {
          const session = state.workoutSessions[day]
          if (!session) return state
          return {
            workoutSessions: {
              ...state.workoutSessions,
              [day]: { ...session, selectedCardio: cardioId },
            },
          }
        }),

      setCardioDone: (day, done) =>
        set((state) => {
          const session = state.workoutSessions[day]
          if (!session) return state
          return {
            workoutSessions: {
              ...state.workoutSessions,
              [day]: { ...session, cardioDone: done },
            },
          }
        }),
    }),
    {
      name: "transformation-os-v2",    // v2 so old seed-data cache is abandoned
      partialize: (state) => ({
        // Persisted to localStorage as a fast-load cache
        // Supabase is always the source of truth on init
        entries:         state.entries,
        workoutSessions: state.workoutSessions,
        currentDay:      state.currentDay,
        startDate:       state.startDate,
        userId:          state.userId,
        startWeight:     state.startWeight,
        goalWeight:      state.goalWeight,
        calorieTarget:   state.calorieTarget,
        proteinTarget:   state.proteinTarget,
      }),
    }
  )
)

// ─── Helpers (module-private) ─────────────────────────────────────────────────

function emptyEntry(day: number): DayEntry {
  return { day, workoutDone: false, calories: null, protein: null, weight: null, completed: false }
}

/**
 * Fire-and-forget Supabase sync for a single DayEntry.
 * Runs outside of set() so it doesn't block the synchronous state update.
 */
function syncEntry(
  state: Pick<TransformationStore, "userId" | "startDate">,
  entry: DayEntry
): void {
  if (!state.userId || !state.startDate) return
  upsertDailyLog(entryToLog(state.userId, state.startDate, entry)).catch((err) =>
    console.error("[store] upsertDailyLog failed:", err)
  )

  // Keep goal_weight / start_weight in user_progress in sync
  updateUserProgress(state.userId, {}).catch(() => {/* best-effort */})
}

// ─── Derived hooks ────────────────────────────────────────────────────────────

export function useCurrentEntry() {
  return useStore(
    useShallow((s) => ({
      entry:         s.entries[s.currentDay],
      currentDay:    s.currentDay,
      calorieTarget: s.calorieTarget,
      proteinTarget: s.proteinTarget,
    }))
  )
}

export function useWeightHistory(): Array<{ day: number; weight: number }> {
  return useStore(
    useShallow((s) =>
      Object.values(s.entries)
        .filter((e): e is DayEntry & { weight: number } => e.weight !== null)
        .sort((a, b) => a.day - b.day)
    )
  )
}

export function useWorkoutSession(day: number) {
  return useStore((s) => s.workoutSessions[day] ?? null)
}
