import { LoadChart } from "@/components/analytics/load-chart";
import { SportDistributionChart } from "@/components/analytics/sport-distribution-chart";
import { VolumeChart } from "@/components/analytics/volume-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  computeAnalyticsSummary,
  computePmcSeries,
  computeSportDistribution,
  computeWeeklyVolume,
  type ActivityForAnalytics,
} from "@/lib/analytics";

interface AnalyticsViewProps {
  activities: ActivityForAnalytics[];
}

export function AnalyticsView({ activities }: AnalyticsViewProps) {
  const pmc = computePmcSeries(activities);
  const weeklyVolume = computeWeeklyVolume(activities);
  const distribution = computeSportDistribution(activities);
  const summary = computeAnalyticsSummary(activities, pmc);

  const tsbLabel =
    summary.tsb > 10
      ? "Frais"
      : summary.tsb > -10
        ? "Optimal"
        : summary.tsb > -25
          ? "Fatigué"
          : "Surchargé";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Analytics
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Performance
        </h1>
        <p className="mt-1 text-muted-foreground">
          {summary.totalActivities} séances analysées sur {summary.periodDays} jours.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="CTL — Forme"
          value={String(summary.ctl)}
          sublabel="Charge chronique (42j)"
          accent="cyan"
        />
        <MetricCard
          label="ATL — Fatigue"
          value={String(summary.atl)}
          sublabel="Charge aiguë (7j)"
          accent="orange"
        />
        <MetricCard
          label="TSB — Fraîcheur"
          value={String(summary.tsb)}
          sublabel={tsbLabel}
          accent="violet"
        />
        <MetricCard
          label="Volume 7j"
          value={`${summary.weeklyHours}h`}
          sublabel={`${summary.weeklyLoad} charge estimée`}
        />
      </section>

      <LoadChart data={pmc} />

      <div className="grid gap-4 lg:grid-cols-2">
        <VolumeChart data={weeklyVolume} />
        <SportDistributionChart data={distribution} />
      </div>
    </div>
  );
}
