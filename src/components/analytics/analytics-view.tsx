'use client';

import {
  AnalyticsSection,
  AnalyticsStat,
  FormStatusBanner,
} from '@/components/analytics/analytics-cards';
import { PerformancePredictions } from '@/components/analytics/predictions/performance-predictions';
import { Skeleton } from '@/components/ui/skeleton';
import { buildAnalyticsViewModel, type ActivityForAnalytics } from '@/lib/analytics';
import { useAnalyticsPmc } from '@/hooks/use-presentation-view-model';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const LoadChart = dynamic(
  () => import('@/components/analytics/charts/load-chart').then((mod) => mod.LoadChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const VolumeChart = dynamic(
  () => import('@/components/analytics/charts/volume-chart').then((mod) => mod.VolumeChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const SportDistributionChart = dynamic(
  () =>
    import('@/components/analytics/charts/sport-distribution-chart').then(
      (mod) => mod.SportDistributionChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

interface AnalyticsViewProps {
  activities: ActivityForAnalytics[];
}

export function AnalyticsView({ activities }: AnalyticsViewProps) {
  const { weeklyVolume, distribution, summary } = useMemo(
    () => buildAnalyticsViewModel(activities),
    [activities],
  );

  // The PMC comes from the server: it is derived from the Core's Training Stress,
  // which needs stored session features the browser cannot read. See ADR-011.
  const { data: pmc = [] } = useAnalyticsPmc();
  const anchor = pmc.at(-1);

  return (
    <div className="space-y-4">
      {/* Niveau 1 — lecture du moment */}
      <FormStatusBanner pmc={pmc} />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsStat
          hint="Charge chronique (42 j)"
          label="CTL · Forme"
          value={anchor ? String(anchor.ctl) : '—'}
        />
        <AnalyticsStat
          hint="Charge aiguë (7 j)"
          label="ATL · Fatigue"
          value={anchor ? String(anchor.atl) : '—'}
        />
        <AnalyticsStat
          hint="CTL − ATL"
          label="TSB · Fraîcheur"
          value={anchor ? `${anchor.tsb > 0 ? '+' : ''}${anchor.tsb}` : '—'}
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
