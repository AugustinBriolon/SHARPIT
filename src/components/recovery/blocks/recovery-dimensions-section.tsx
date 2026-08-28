import { ContributionBars } from '@/components/today/drill-down/contribution-bars';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { DimensionResult } from '@/hooks/use-today';

const DIMENSION_LABEL: Record<string, string> = {
  autonomic: 'Système autonome',
  sleep: 'Phases de sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

const DIMENSION_DESCRIPTION: Record<string, string> = {
  autonomic: 'VFC + FC repos',
  sleep: 'Profond + REM (± dette 7j) — pas le score nuit',
  subjective: 'RPE, stress, bien-être',
  loadContext: 'Charge aiguë vs chronique',
};

export function RecoveryDimensionsSection({
  dimensions,
  limiterKey = null,
  loading = false,
}: {
  dimensions: Record<string, DimensionResult>;
  /** Dimension the verdict blames — emphasised instead of merely listed. */
  limiterKey?: string | null;
  loading?: boolean;
}) {
  if (loading) {
    return null;
  }

  const items = Object.keys(DIMENSION_LABEL).map((key) => ({
    key,
    label: DIMENSION_LABEL[key] ?? key,
    score: dimensions[key]?.score ?? null,
    hint: DIMENSION_DESCRIPTION[key] ?? null,
  }));

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Contribution au score</DrillDownSectionLabel>
      <div className="mt-3">
        <ContributionBars items={items} limiterKey={limiterKey} />
      </div>
    </DrillDownSectionCard>
  );
}
