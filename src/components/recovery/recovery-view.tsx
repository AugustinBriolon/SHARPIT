'use client';

import { useMemo } from 'react';
import { MetricLineChart } from '@/components/recovery/health-charts';
import { ReadinessHero, RecoveryStat } from '@/components/recovery/recovery-panels';
import { PageHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { computePmcSeries } from '@/lib/analytics';
import { buildHealthSeries, computeTrend, formatSleep } from '@/lib/health';
import {
  bodyBatteryTone,
  buildFormView,
  buildHrvStatusView,
  buildReadinessView,
  stressTone,
  type ReadinessFactor,
} from '@/lib/recovery';
import { useActivities, useHealthEntries } from '@/hooks/use-data';

export function RecoveryView({ embedded = false }: { embedded?: boolean }) {
  const healthQuery = useHealthEntries();
  const activitiesQuery = useActivities();

  const entries = useMemo(() => healthQuery.data ?? [], [healthQuery.data]);
  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);

  const series = useMemo(() => buildHealthSeries(entries, 60), [entries]);
  const pmc = useMemo(() => computePmcSeries(activities, 90), [activities]);

  const hrv = useMemo(() => computeTrend(entries, 'hrv'), [entries]);
  const restingHr = useMemo(() => computeTrend(entries, 'restingHr'), [entries]);
  const weight = useMemo(() => computeTrend(entries, 'weightKg'), [entries]);
  const sleep = useMemo(() => computeTrend(entries, 'sleepMinutes'), [entries]);

  const latest = useMemo(
    () => [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
    [entries],
  );

  if (isAnyInitialQueryLoad([healthQuery, activitiesQuery])) {
    return <RecoverySkeleton embedded={embedded} />;
  }

  const readiness = buildReadinessView(
    latest?.recoveryScore ?? null,
    latest?.readinessLevel ?? null,
  );
  const factors = (latest?.readinessFactors ?? []) as unknown as ReadinessFactor[];
  const hrvStatus = buildHrvStatusView(latest?.hrvStatus ?? null);
  const form = buildFormView(pmc);

  const stress = latest?.stress ?? null;
  const bodyBattery = latest?.bodyBattery ?? null;

  const hrvBaseline =
    latest?.hrvBaselineLow != null && latest?.hrvBaselineHigh != null
      ? `Baseline ${latest.hrvBaselineLow}–${latest.hrvBaselineHigh} ms`
      : undefined;

  return (
    <div className="space-y-4">
      {!embedded && (
        <PageHeader embedded={embedded}>
          <p className="text-primary text-xs font-medium uppercase">Recovery</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Récupération</h1>
          <p className="text-muted-foreground mt-1">
            Es-tu prêt à pousser aujourd&apos;hui ? Lecture combinée de ta charge et de tes
            constantes Garmin.
          </p>
        </PageHeader>
      )}

      <ReadinessHero factors={factors} view={readiness} />

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Signaux du jour
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RecoveryStat
            footer={hrvBaseline}
            label="Statut HRV"
            sublabel={hrv.latest != null ? `${hrv.latest} ms` : undefined}
            tone={hrvStatus.tone}
            value={hrvStatus.label}
          />
          <RecoveryStat
            footer={form.description}
            label="Forme (TSB)"
            sublabel={form.label}
            tone={form.tone}
            value={form.tsb != null ? `${form.tsb > 0 ? '+' : ''}${form.tsb}` : '—'}
          />
          <RecoveryStat
            footer="Énergie max du jour"
            label="Body Battery"
            tone={bodyBatteryTone(bodyBattery)}
            value={bodyBattery != null ? `${bodyBattery}` : '—'}
          />
          <RecoveryStat
            footer="Sur la journée"
            label="Stress moyen"
            tone={stressTone(stress)}
            value={stress != null ? `${stress}` : '—'}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Constantes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RecoveryStat
            footer="Fréquence cardiaque au repos"
            label="FC repos"
            tone="neutral"
            value={restingHr.latest != null ? `${restingHr.latest} bpm` : '—'}
          />
          <RecoveryStat
            label="Sommeil moy. 7j"
            tone="neutral"
            value={sleep.avg7 != null ? formatSleep(Math.round(sleep.avg7)) : '—'}
          />
          <RecoveryStat
            label="Poids"
            tone="neutral"
            value={weight.latest != null ? `${weight.latest} kg` : '—'}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Tendances — 60 jours
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <MetricLineChart
            color="#7c3aed"
            data={series}
            dataKey="hrv"
            subtitle="Variabilité cardiaque — 60 jours"
            title="HRV"
            unit="ms"
          />
          <MetricLineChart
            color="#ea580c"
            data={series}
            dataKey="restingHr"
            subtitle="Fréquence cardiaque au repos"
            title="FC repos"
            unit="bpm"
          />
          <MetricLineChart
            color="#0891b2"
            data={series}
            dataKey="sleepHours"
            subtitle="Heures par nuit"
            title="Sommeil"
            unit="h"
          />
          <MetricLineChart
            color="#2563eb"
            data={series}
            dataKey="weightKg"
            subtitle="Pesées (Withings, Renpho ou Garmin)"
            title="Poids"
            unit="kg"
          />
        </div>
      </section>
    </div>
  );
}

function RecoverySkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
      )}
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
