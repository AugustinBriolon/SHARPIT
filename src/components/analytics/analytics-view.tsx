'use client';

import {
  AnalyticsSection,
  AnalyticsStat,
  FormStatusBanner,
} from '@/components/analytics/analytics-cards';
import { LoadChart } from '@/components/analytics/load-chart';
import { SportDistributionChart } from '@/components/analytics/sport-distribution-chart';
import { VolumeChart } from '@/components/analytics/volume-chart';
import { buildAnalyticsViewModel, type ActivityForAnalytics } from '@/lib/analytics';
import { useMemo } from 'react';

interface AnalyticsViewProps {
  activities: ActivityForAnalytics[];
}

export function AnalyticsView({ activities }: AnalyticsViewProps) {
  const { pmc, weeklyVolume, distribution, summary } = useMemo(
    () => buildAnalyticsViewModel(activities),
    [activities],
  );

  return (
    <div className="space-y-4">
      <FormStatusBanner pmc={pmc} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-3 lg:grid-cols-2">
          <VolumeChart data={weeklyVolume} />
          <SportDistributionChart data={distribution} />
        </div>
      </AnalyticsSection>
    </div>
  );
}
