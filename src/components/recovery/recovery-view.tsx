"use client";

import { MetricLineChart } from "@/components/recovery/health-charts";
import {
  ReadinessHero,
  RecoveryStat,
} from "@/components/recovery/recovery-panels";
import { SleepCoachPanel } from "@/components/recovery/sleep-coach-panel";
import { StickyHeader } from "@/components/layout/sticky-header";
import type { SleepEntryInput } from "@/lib/sleep";
import { Skeleton } from "@/components/ui/skeleton";
import { computePmcSeries } from "@/lib/analytics";
import { buildHealthSeries, computeTrend, formatSleep } from "@/lib/health";
import {
  bodyBatteryTone,
  buildFormView,
  buildHrvStatusView,
  buildReadinessView,
  stressTone,
  type ReadinessFactor,
} from "@/lib/recovery";
import { useActivities, useHealthEntries } from "@/hooks/use-data";

export function RecoveryView() {
  const healthQuery = useHealthEntries();
  const activitiesQuery = useActivities();

  if (healthQuery.isLoading || activitiesQuery.isLoading) {
    return <RecoverySkeleton />;
  }

  const entries = healthQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];

  const series = buildHealthSeries(entries, 60);
  const pmc = computePmcSeries(activities, 90);

  const hrv = computeTrend(entries, "hrv");
  const restingHr = computeTrend(entries, "restingHr");
  const weight = computeTrend(entries, "weightKg");
  const sleep = computeTrend(entries, "sleepMinutes");

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latest = sorted[0];

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
    <div className="space-y-8">
      <StickyHeader>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Recovery
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Récupération
        </h1>
        <p className="mt-1 text-muted-foreground">
          Es-tu prêt à pousser aujourd&apos;hui ? Lecture combinée de ta charge
          et de tes constantes Garmin.
        </p>
      </StickyHeader>

      <ReadinessHero view={readiness} factors={factors} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RecoveryStat
          label="Statut HRV"
          value={hrvStatus.label}
          sublabel={hrv.latest != null ? `${hrv.latest} ms` : undefined}
          tone={hrvStatus.tone}
          footer={hrvBaseline}
        />
        <RecoveryStat
          label="Forme (TSB)"
          value={
            form.tsb != null ? `${form.tsb > 0 ? "+" : ""}${form.tsb}` : "—"
          }
          sublabel={form.label}
          tone={form.tone}
          footer={form.description}
        />
        <RecoveryStat
          label="Body Battery"
          value={bodyBattery != null ? `${bodyBattery}` : "—"}
          tone={bodyBatteryTone(bodyBattery)}
          footer="Énergie max du jour"
        />
        <RecoveryStat
          label="Stress moyen"
          value={stress != null ? `${stress}` : "—"}
          tone={stressTone(stress)}
          footer="Sur la journée"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RecoveryStat
          label="FC repos"
          value={restingHr.latest != null ? `${restingHr.latest} bpm` : "—"}
          tone="neutral"
          footer="Fréquence cardiaque au repos"
        />
        <RecoveryStat
          label="Sommeil moy. 7j"
          value={sleep.avg7 != null ? formatSleep(Math.round(sleep.avg7)) : "—"}
          tone="neutral"
        />
        <RecoveryStat
          label="Poids"
          value={weight.latest != null ? `${weight.latest} kg` : "—"}
          tone="neutral"
        />
      </section>

      <SleepCoachPanel entries={entries as unknown as SleepEntryInput[]} />

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-medium">Tendances</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricLineChart
            title="HRV"
            subtitle="Variabilité cardiaque — 60 jours"
            data={series}
            dataKey="hrv"
            color="#7c3aed"
            unit="ms"
          />
          <MetricLineChart
            title="FC repos"
            subtitle="Fréquence cardiaque au repos"
            data={series}
            dataKey="restingHr"
            color="#ea580c"
            unit="bpm"
          />
          <MetricLineChart
            title="Sommeil"
            subtitle="Heures par nuit"
            data={series}
            dataKey="sleepHours"
            color="#0891b2"
            unit="h"
          />
          <MetricLineChart
            title="Poids"
            subtitle="Pesées Garmin"
            data={series}
            dataKey="weightKg"
            color="#2563eb"
            unit="kg"
          />
        </div>
      </section>
    </div>
  );
}

function RecoverySkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
