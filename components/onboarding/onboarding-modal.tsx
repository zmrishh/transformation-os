"use client"

import { useState, useMemo } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import {
  calcBMR,
  calcTDEE,
  calcProteinTarget,
  ACTIVITY_LABELS,
  type ActivityLevel,
} from "@/lib/progress"

// ─── Setup SQL ────────────────────────────────────────────────────────────────

const PROJECT_REF =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ""

const SQL_EDITOR_URL = PROJECT_REF
  ? `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`
  : "https://supabase.com/dashboard"

const SETUP_SQL = `-- Transformation OS — run once in Supabase SQL Editor
-- Also enable: Authentication → Providers → Anonymous Sign-ins → ON

create table if not exists public.user_progress (
  user_id         text         primary key,
  start_date      date         not null,
  start_weight    numeric(5,1) not null,
  goal_weight     numeric(5,1) not null default 75,
  height_cm       numeric(5,1),
  age_years       integer,
  sex             text         check (sex in ('M', 'F')),
  calorie_target  integer      not null default 2100,
  protein_target  integer      not null default 160,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

alter table public.user_progress enable row level security;
drop policy if exists "progress_anon_all"  on public.user_progress;
drop policy if exists "progress_owner_all" on public.user_progress;
create policy "progress_owner_all" on public.user_progress
  using      (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create table if not exists public.daily_logs (
  id            uuid         primary key default gen_random_uuid(),
  user_id       text         not null references public.user_progress(user_id) on delete cascade,
  day           integer      not null check (day >= 1 and day <= 90),
  log_date      date         not null,
  workout_done  boolean      not null default false,
  calories      integer,
  protein       integer,
  weight        numeric(5,1),
  completed     boolean      not null default false,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  unique (user_id, day)
);

create index if not exists daily_logs_user_day_idx
  on public.daily_logs (user_id, day desc);

alter table public.daily_logs enable row level security;
drop policy if exists "logs_anon_all"  on public.daily_logs;
drop policy if exists "logs_owner_all" on public.daily_logs;
create policy "logs_owner_all" on public.daily_logs
  using      (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);`

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(fields: {
  startWeight: string
  goalWeight: string
  height: string
  age: string
}): string | null {
  const sw = Number(fields.startWeight)
  const gw = Number(fields.goalWeight)
  const h  = Number(fields.height)
  const a  = Number(fields.age)

  if (!sw || sw < 30 || sw > 300)    return "Enter a valid starting weight (30–300 kg)"
  if (!gw || gw < 30 || gw > 300)    return "Enter a valid goal weight (30–300 kg)"
  if (gw >= sw)                       return "Goal weight must be less than starting weight"
  if (!h  || h  < 100 || h > 250)    return "Enter a valid height (100–250 cm)"
  if (!a  || a  < 10  || a > 100)    return "Enter a valid age (10–100)"
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingModal() {
  const createProfile = useStore((s) => s.createProfile)

  // Form state
  const [startWeight, setStartWeight] = useState("")
  const [goalWeight,  setGoalWeight]  = useState("")
  const [height,      setHeight]      = useState("")
  const [age,         setAge]         = useState("")
  const [sex,         setSex]         = useState<"M" | "F">("M")
  const [activity,    setActivity]    = useState<ActivityLevel>("moderate")
  const [deficit,     setDeficit]     = useState<250 | 500 | 750>(500)

  // UI state
  const [saving,      setSaving]      = useState(false)
  const [fieldError,  setFieldError]  = useState<string | null>(null)
  const [setupError,  setSetupError]  = useState(false)
  const [copied,      setCopied]      = useState(false)

  // ── Live calorie / protein calculation ───────────────────────────────
  const calcs = useMemo(() => {
    const sw = Number(startWeight)
    const gw = Number(goalWeight)
    const h  = Number(height)
    const a  = Number(age)
    if (!sw || !h || !a || sw < 30 || h < 100 || a < 10) return null

    const bmr         = calcBMR(sw, h, a, sex)
    const maintenance = calcTDEE(bmr, activity)
    const target      = maintenance - deficit
    const protein     = calcProteinTarget(gw > 0 ? gw : sw)

    return { maintenance, target, protein }
  }, [startWeight, goalWeight, height, age, sex, activity, deficit])

  // ── Handlers ─────────────────────────────────────────────────────────
  async function handleBegin() {
    const err = validate({ startWeight, goalWeight, height, age })
    if (err) { setFieldError(err); return }
    setFieldError(null)
    setSaving(true)

    try {
      await createProfile({
        startWeight:   Number(startWeight),
        goalWeight:    Number(goalWeight),
        heightCm:      Number(height),
        ageYears:      Number(age),
        sex,
        calorieTarget: calcs?.target ?? 2100,
        proteinTarget: calcs?.protein ?? 160,
      })
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("schema cache") || msg.includes("user_progress")) {
        setSetupError(true)
      } else {
        setFieldError("Could not save. Check your Supabase connection.")
      }
      setSaving(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(SETUP_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Render: setup error panel ─────────────────────────────────────────
  if (setupError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6 overflow-y-auto py-10"
        style={{ background: "var(--background)" }}>
        <div className="section-reveal w-full max-w-sm flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
              One-time setup required
            </p>
            <h2 className="text-2xl font-bold tracking-tight">Connect your database</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Supabase tables don&apos;t exist yet. Run the SQL below — takes 10 seconds.
            </p>
          </div>

          {/* Steps */}
          <ol className="flex flex-col gap-4">
            {[
              {
                n: "1",
                label: "Copy the SQL",
                action: (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95"
                    style={{
                      background: copied ? "var(--success-muted)" : "var(--secondary)",
                      color:      copied ? "var(--success)"       : "var(--foreground)",
                    }}
                  >
                    {copied ? <><CheckIcon className="size-3" /> Copied</> : <><CopyIcon className="size-3" /> Copy SQL</>}
                  </button>
                ),
              },
              {
                n: "2",
                label: "Run it in the Supabase SQL Editor",
                action: (
                  <a
                    href={SQL_EDITOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                    style={{ background: "var(--secondary)", color: "var(--foreground)" }}
                  >
                    <ExternalLinkIcon className="size-3" /> Open Editor
                  </a>
                ),
              },
              { n: "3", label: "Reload this page" },
            ].map(({ n, label, action }) => (
              <li key={n} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="size-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                    style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                  >{n}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                {action}
              </li>
            ))}
          </ol>

          {/* SQL block */}
          <div className="rounded-xl overflow-hidden border border-border" style={{ background: "var(--secondary)" }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">SQL</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed text-muted-foreground overflow-x-auto p-4 font-mono max-h-52">
              {SETUP_SQL}
            </pre>
          </div>

          <button
            onClick={() => { setSetupError(false); setSaving(false) }}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors text-center"
          >
            ← Back to form
          </button>
        </div>
      </div>
    )
  }

  // ── Render: main onboarding form ──────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 overflow-y-auto py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="section-reveal w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/60">
            100 Day Transformation OS
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Start your journey</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your 100-day clock starts today.
          </p>
        </div>

        {/* ── Weights ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <FieldRow label="Starting weight" hint="Today" unit="kg">
            <NumInput value={startWeight} onChange={setStartWeight} placeholder="90.0" autoFocus />
          </FieldRow>

          <FieldRow label="Goal weight" hint="By Day 100" unit="kg">
            <NumInput value={goalWeight} onChange={setGoalWeight} placeholder="78.0" />
          </FieldRow>
        </div>

        {/* ── Body stats ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <FieldRow label="Height" unit="cm" flex>
              <NumInput value={height} onChange={setHeight} placeholder="178" />
            </FieldRow>
            <FieldRow label="Age" unit="yrs" flex>
              <NumInput value={age} onChange={setAge} placeholder="28" />
            </FieldRow>
          </div>

          {/* Sex toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">Sex</span>
            <div className="flex gap-2">
              {(["M", "F"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: sex === s ? "var(--primary)" : "var(--secondary)",
                    color:      sex === s ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {s === "M" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Activity level ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
            Activity level
          </span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setActivity(level)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                style={{
                  background: activity === level ? "var(--primary)" : "var(--secondary)",
                  color:      activity === level ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
              >
                {ACTIVITY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Calorie preview ───────────────────────────────────────── */}
        {calcs ? (
          <div className="flex flex-col gap-3 rounded-2xl px-5 py-4" style={{ background: "var(--secondary)" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Maintenance</span>
              <span className="text-sm font-medium tabular-nums">{calcs.maintenance.toLocaleString()} kcal</span>
            </div>

            {/* Deficit selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Deficit</span>
              <div className="flex gap-1.5">
                {([250, 500, 750] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDeficit(d)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                    style={{
                      background: deficit === d ? "var(--primary)" : "oklch(1 0 0 / 5%)",
                      color:      deficit === d ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    −{d}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border opacity-40" />

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--success)" }}>
                Your target
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums" style={{ color: "var(--success)" }}>
                  {calcs.target.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">kcal/day</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Protein target</span>
              <span className="text-sm font-medium tabular-nums text-foreground/70">
                {calcs.protein}g/day
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground/40 italic">
              −{deficit} kcal/day ≈ {(deficit / 7700 * 7).toFixed(1)} kg/week loss
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-center"
            style={{ background: "var(--secondary)" }}
          >
            <p className="text-xs text-muted-foreground/40">
              Fill in your stats above to see your calorie target
            </p>
          </div>
        )}

        {/* Error */}
        {fieldError && (
          <p className="text-xs text-center" style={{ color: "var(--missed)" }}>
            {fieldError}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handleBegin}
          disabled={saving}
          className={cn(
            "rounded-full py-4 text-base font-medium tracking-wide transition-all duration-200 active:scale-[0.97]",
            saving
              ? "bg-secondary text-muted-foreground cursor-wait"
              : "bg-primary text-primary-foreground shadow-[0_4px_24px_oklch(0_0_0/0.5)] hover:-translate-y-0.5",
          )}
        >
          {saving ? "Saving…" : "Begin Day 1"}
        </button>

        <p className="text-xs text-center text-muted-foreground/40 pb-2">
          Your data is stored privately. No account needed.
        </p>

      </div>
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  unit,
  flex,
  children,
}: {
  label: string
  hint?: string
  unit: string
  flex?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", flex && "flex-1")}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div
        className="flex items-center gap-2 rounded-2xl px-5 py-3.5"
        style={{ background: "var(--secondary)" }}
      >
        {children}
        <span className="text-sm text-muted-foreground flex-shrink-0">{unit}</span>
      </div>
    </div>
  )
}

function NumInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      min={0}
      step={0.1}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex-1 min-w-0 bg-transparent text-lg font-semibold text-foreground",
        "placeholder:text-muted-foreground/30 focus:outline-none tabular-nums",
        "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
      )}
    />
  )
}
