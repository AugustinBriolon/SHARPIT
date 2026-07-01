'use client';

import { useMemo } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { LoadChart } from '@/components/analytics/load-chart';
import { SportDistributionChart } from '@/components/analytics/sport-distribution-chart';
import { VolumeChart } from '@/components/analytics/volume-chart';
import {
  AnalyticsSection,
  AnalyticsStat,
  FormStatusBanner,
} from '@/components/analytics/analytics-cards';
import {
  computeAnalyticsSummary,
  computePmcSeries,
  computeSportDistribution,
  computeWeeklyVolume,
  type ActivityForAnalytics,
} from '@/lib/analytics';

interface AnalyticsViewProps {
  activities: ActivityForAnalytics[];
}

export function AnalyticsView({ activities }: AnalyticsViewProps) {
  const pmc = useMemo(() => computePmcSeries(activities), [activities]);
  const weeklyVolume = useMemo(() => computeWeeklyVolume(activities), [activities]);
  const distribution = useMemo(() => computeSportDistribution(activities), [activities]);
  const summary = useMemo(() => computeAnalyticsSummary(activities, pmc), [activities, pmc]);

  return (
    <div className="space-y-8">
      <FormStatusBanner pmc={pmc} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsStat
          hint="Charge chronique (42 j)"
          label="CTL · Forme"
          value={String(summary.ctl)}
        />
        <AnalyticsStat
          hint="Charge aiguë (7 j)"
          label="ATL · Fatigue"
          value={String(summary.atl)}
        />
        <AnalyticsStat
          hint="CTL − ATL"
          label="TSB · Fraîcheur"
          value={`${summary.tsb > 0 ? '+' : ''}${summary.tsb}`}
        />
        <AnalyticsStat
          hint={`${summary.weeklyLoad} TSS estimés · ${summary.totalActivities} séances`}
          label="Volume 7 j"
          value={`${summary.weeklyHours} h`}
        />
      </section>

      <AnalyticsSection
        description="Évolution de ta forme (CTL), fatigue (ATL) et fraîcheur (TSB) — modèle Banister sur 6 mois."
        title="Modèle de charge (PMC)"
      >
        <LoadChart data={pmc} />
      </AnalyticsSection>

      <AnalyticsSection
        description="Heures par semaine et part de chaque sport sur les 90 derniers jours."
        title="Volume & répartition"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <VolumeChart data={weeklyVolume} />
          <SportDistributionChart data={distribution} />
        </div>
      </AnalyticsSection>
    </div>
  );
}
