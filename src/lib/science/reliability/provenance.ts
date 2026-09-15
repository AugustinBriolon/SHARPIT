/**
 * Athlete-facing provenance for Science Sport reliability V0.
 * Deterministic only — never LLM-authored.
 *
 * @see docs/science/reliability-grid-v0.md
 * @see docs/design/confidence-brief-v0.md
 */

import type { PackGapCode, PackTier, PackTierResult } from '@/core/science/pack-tier';

export type ProvenanceSeriesKey = 'sleep' | 'hrv' | 'baseline' | 'load' | 'sport' | 'journal';

export type ProvenanceSeriesLine = {
  readonly key: ProvenanceSeriesKey;
  readonly label: string;
  readonly detail: string;
  readonly status: 'ok' | 'gap' | 'partial';
};

export type ReliabilityProvenance = {
  readonly packTier: PackTier;
  readonly estimationChip: string | null;
  readonly series: readonly ProvenanceSeriesLine[];
  readonly gaps: readonly PackGapCode[];
  readonly gapLabels: readonly string[];
  readonly goalVsJournalWeight: string;
  readonly rationaleCodes: readonly string[];
  readonly rationaleLabels: readonly string[];
};

const GAP_LABEL_FR: Record<PackGapCode, string> = {
  SLEEP_MISSING: 'Sommeil de la nuit manquant',
  SLEEP_STALE: 'Sommeil trop ancien (plus de 18 h)',
  HRV_MISSING: 'HRV du matin manquante',
  HRV_STALE: 'HRV trop ancienne (plus de 12 h)',
  BASELINE_MISSING: 'Baseline HRV indisponible',
  BASELINE_SHORT: 'Baseline HRV trop courte (moins de 7 j)',
  BASELINE_PARTIAL: 'Baseline HRV partielle (moins de 14 j)',
  LOAD_MISSING: 'Charge 7 j indisponible',
  LOAD_STALE: 'Sync charge trop ancienne (plus de 48 h)',
  LOAD_SPARSE: 'Couverture charge insuffisante (moins de 5/7 j)',
  SPORT_CONTEXT_MISSING: 'Contexte sport manquant pour l’intensité',
  RECOVERY_DIMENSIONS_LOW: 'Moins de 2 dimensions de récupération',
};

function formatAgeHours(ageHours: number | null): string {
  if (ageHours === null) {
    return 'indisponible';
  }
  if (ageHours < 1) {
    return 'moins d’1 h';
  }
  const rounded = Math.round(ageHours);
  return `${rounded} h`;
}

export type ProvenanceBuildInput = {
  readonly pack: PackTierResult;
  readonly sleepNightAgeHours: number | null;
  readonly morningHrvAgeHours: number | null;
  readonly hrvBaselineDays: number | null;
  readonly loadSyncAgeHours: number | null;
  readonly loadDaysCoveredIn7: number | null;
  readonly journalWeighted: boolean;
  readonly goalWeightLabel?: string | null;
  readonly journalWeightLabel?: string | null;
  readonly rationaleCodes: readonly string[];
  readonly resolveRationale?: (code: string) => string;
};

function seriesStatus(gapPresent: boolean, softGap: boolean): 'ok' | 'gap' | 'partial' {
  if (gapPresent) {
    return 'gap';
  }
  if (softGap) {
    return 'partial';
  }
  return 'ok';
}

export function buildReliabilityProvenance(input: ProvenanceBuildInput): ReliabilityProvenance {
  const gaps = new Set(input.pack.gaps);
  const resolve = input.resolveRationale ?? ((code: string) => code);

  const series: ProvenanceSeriesLine[] = [
    {
      key: 'sleep',
      label: 'Sommeil nuit J',
      detail: `Âge : ${formatAgeHours(input.sleepNightAgeHours)}`,
      status: seriesStatus(gaps.has('SLEEP_MISSING') || gaps.has('SLEEP_STALE'), false),
    },
    {
      key: 'hrv',
      label: 'HRV matin',
      detail: `Âge : ${formatAgeHours(input.morningHrvAgeHours)}`,
      status: seriesStatus(gaps.has('HRV_MISSING') || gaps.has('HRV_STALE'), false),
    },
    {
      key: 'baseline',
      label: 'Baseline HRV',
      detail:
        input.hrvBaselineDays === null
          ? 'indisponible'
          : `${input.hrvBaselineDays} j d’historique`,
      status: seriesStatus(
        gaps.has('BASELINE_MISSING') || gaps.has('BASELINE_SHORT'),
        gaps.has('BASELINE_PARTIAL'),
      ),
    },
    {
      key: 'load',
      label: 'Charge 7 j',
      detail:
        input.loadDaysCoveredIn7 === null
          ? `Sync : ${formatAgeHours(input.loadSyncAgeHours)}`
          : `Sync : ${formatAgeHours(input.loadSyncAgeHours)} · ${input.loadDaysCoveredIn7}/7 j`,
      status: seriesStatus(
        gaps.has('LOAD_MISSING') || gaps.has('LOAD_STALE') || gaps.has('LOAD_SPARSE'),
        false,
      ),
    },
    {
      key: 'journal',
      label: 'Journal (wellness matin)',
      detail: input.journalWeighted
        ? 'Humeur, énergie, corps, stress pris en compte'
        : 'Pas encore de check-in matin',
      status: input.journalWeighted ? 'ok' : 'partial',
    },
  ];

  const goalLabel = input.goalWeightLabel ?? 'Objectif';
  const journalLabel = input.journalWeightLabel ?? 'Journal wellness';
  const goalVsJournalWeight = input.journalWeighted
    ? `${goalLabel} prioritaire · ${journalLabel} pondéré en Recovery v1`
    : `${goalLabel} prioritaire · journal wellness non encore saisi`;

  return {
    packTier: input.pack.packTier,
    estimationChip:
      input.pack.packTier === 'FULL'
        ? null
        : input.pack.packTier === 'INSUFFICIENT'
          ? 'Données insuffisantes'
          : 'Estimation partielle',
    series,
    gaps: input.pack.gaps,
    gapLabels: input.pack.gaps.map((g) => GAP_LABEL_FR[g]),
    goalVsJournalWeight,
    rationaleCodes: input.rationaleCodes,
    rationaleLabels: input.rationaleCodes.map(resolve),
  };
}

export function gapLabelFr(code: PackGapCode): string {
  return GAP_LABEL_FR[code];
}
