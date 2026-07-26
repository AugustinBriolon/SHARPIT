import type { ReactNode } from 'react';
import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import type { SleepNightStatus } from '@/core/presentation/sleep-view-model';
import { formatDuration } from '@/lib/sleep/sleep';
import { formatSleepDuration } from '@/lib/sleep/sleep-scoring';

/**
 * Sleep why — night-first narrative for the structure | pourquoi composition.
 */
export function SleepWhyBlock({
  debt7Min,
  targetDeltaMin,
  restorativeRatio,
  nightStatus = 'present',
  loading = false,
  asPanel = false,
}: {
  debt7Min: number | null;
  targetDeltaMin: number | null;
  restorativeRatio: number | null;
  nightStatus?: SleepNightStatus;
  loading?: boolean;
  /** Wrap in analysis panel for 2-col composition beside night structure. */
  asPanel?: boolean;
}) {
  let body: ReactNode = null;

  if (loading) {
    body = <PhysioDomainWhy label="Pourquoi" primary={null} loading />;
  } else if (nightStatus === 'pending') {
    body = (
      <PhysioDomainWhy
        label="Pourquoi"
        primary="Les données de sommeil ne sont pas encore arrivées — le verdict nuit attend la sync."
      />
    );
  } else if (nightStatus === 'missing') {
    body = (
      <PhysioDomainWhy label="Pourquoi" primary="Pas de données de sommeil pour cette date." />
    );
  } else {
    let primary: string | null = null;
    if (debt7Min != null && debt7Min > 30) {
      primary = `Dette 7 jours ${formatDuration(debt7Min)} — à résorber sur les prochaines nuits.`;
    } else if (targetDeltaMin != null && targetDeltaMin < 0) {
      primary = `${formatSleepDuration(Math.abs(targetDeltaMin))} sous l’objectif cette nuit.`;
    } else if (restorativeRatio != null && restorativeRatio < 40) {
      primary = `Part restauratrice à ${restorativeRatio} % — profondeur / paradoxe à surveiller.`;
    } else if (targetDeltaMin != null && targetDeltaMin >= 0) {
      primary =
        'Endormissement et architecture dans la cible — maintenir la régularité du coucher.';
    }

    if (primary) {
      body = <PhysioDomainWhy label="Pourquoi" primary={primary} />;
    }
  }

  if (!body) return null;
  if (!asPanel) return body;
  return <DrillDownSectionCard className="h-full">{body}</DrillDownSectionCard>;
}
