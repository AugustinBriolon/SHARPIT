import { LoadChart } from "@/components/analytics/load-chart";
import { SportDistributionChart } from "@/components/analytics/sport-distribution-chart";
import { VolumeChart } from "@/components/analytics/volume-chart";
import {
  AnalyticsSection,
  AnalyticsStat,
  FormStatusBanner,
} from "@/components/analytics/analytics-cards";
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
          Ta charge, ton volume et ta répartition par sport sur les{" "}
          {summary.periodDays} derniers jours.
        </p>
      </header>

      <FormStatusBanner pmc={pmc} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsStat
          label="CTL · Forme"
          value={String(summary.ctl)}
          hint="Charge chronique (42 j)"
        />
        <AnalyticsStat
          label="ATL · Fatigue"
          value={String(summary.atl)}
          hint="Charge aiguë (7 j)"
        />
        <AnalyticsStat
          label="TSB · Fraîcheur"
          value={`${summary.tsb > 0 ? "+" : ""}${summary.tsb}`}
          hint="CTL − ATL"
        />
        <AnalyticsStat
          label="Volume 7 j"
          value={`${summary.weeklyHours} h`}
          hint={`${summary.weeklyLoad} TSS estimés · ${summary.totalActivities} séances`}
        />
      </section>

      <AnalyticsSection
        title="Modèle de charge (PMC)"
        description="Évolution de ta forme (CTL), fatigue (ATL) et fraîcheur (TSB) — modèle Banister sur 6 mois."
      >
        <LoadChart data={pmc} />
      </AnalyticsSection>

      <AnalyticsSection
        title="Volume & répartition"
        description="Heures par semaine et part de chaque sport sur les 90 derniers jours."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <VolumeChart data={weeklyVolume} />
          <SportDistributionChart data={distribution} />
        </div>
      </AnalyticsSection>
    </div>
  );
}
