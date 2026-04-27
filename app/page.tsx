import { Nav } from "@/components/nav"
import { DashboardHero } from "@/components/dashboard/hero"
import { CompleteButton } from "@/components/dashboard/complete-button"
import { StreakTimeline } from "@/components/dashboard/streak-timeline"
import { TodayStatus } from "@/components/dashboard/today-status"
import { BodyMetrics } from "@/components/dashboard/body-metrics"
import { QuickInput } from "@/components/dashboard/quick-input"
import { SystemInsight } from "@/components/dashboard/system-insight"
import { Separator } from "@/components/ui/separator"

// Each section has a reveal delay so they cascade in on first load
const DELAYS = [0, 80, 160, 240, 320, 400, 480, 560]

function Section({
  children,
  delayIndex = 0,
}: {
  children: React.ReactNode
  delayIndex?: number
}) {
  return (
    <div
      className="section-reveal"
      style={{ animationDelay: `${DELAYS[delayIndex] ?? 0}ms` }}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-lg px-4 sm:px-6 pt-20 sm:pt-24 pb-24 flex flex-col gap-10 sm:gap-14">

        <Section delayIndex={0}>
          <DashboardHero />
        </Section>

        <Section delayIndex={1}>
          <CompleteButton />
        </Section>

        <Section delayIndex={2}>
          <StreakTimeline />
        </Section>

        <Section delayIndex={3}>
          <SystemInsight />
        </Section>

        <Separator className="opacity-30" />

        <Section delayIndex={4}>
          <TodayStatus />
        </Section>

        <Separator className="opacity-30" />

        <Section delayIndex={5}>
          <QuickInput />
        </Section>

        <Separator className="opacity-30" />

        <Section delayIndex={6}>
          <BodyMetrics />
        </Section>

      </main>
    </div>
  )
}
