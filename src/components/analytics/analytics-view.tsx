'use client';

import {
  AnalyticsSection,
  AnalyticsStat,
  FormStatusBanner,
} from '@/components/analytics/analytics-cards';
import { LoadChart } from '@/components/analytics/charts/load-chart';
import { PerformancePredictions } from '@/components/analytics/predictions/performance-predictions';
import { SportDistributionChart } from '@/components/analytics/charts/sport-distribution-chart';
import { VolumeChart } from '@/components/analytics/charts/volume-chart';
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
      {/* Niveau 1 — lecture du moment */}
      <FormStatusBanner pmc={pmc} />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
          hint={`${summary.weeklyLoad} TSS · ${summary.totalActivities} séances`}
          label="Volume 7 j"
          value={`${summary.weeklyHours} h`}
        />
      </section>

      <AnalyticsSection
        description="Forme (CTL), fatigue (ATL) et fraîcheur (TSB) — 6 mois."
        title="Modèle de charge"
        compact
      >
        <LoadChart data={pmc} />
      </AnalyticsSection>

      {/* Niveau 2 — projection à partir de l’état actuel */}
      <PerformancePredictions />

      {/* Niveau 3 — analyse secondaire */}
      <AnalyticsSection
        description="Contexte complémentaire : heures par semaine et mix sportif — 90 j."
        title="Volume & répartition"
        compact
      >
        <div className="grid gap-2 lg:grid-cols-2">
          <VolumeChart data={weeklyVolume} />
          <SportDistributionChart data={distribution} />
        </div>
      </AnalyticsSection>
    </div>
  );
}
