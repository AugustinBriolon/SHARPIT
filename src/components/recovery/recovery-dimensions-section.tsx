import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { DimensionResult } from '@/hooks/use-today';

const DIMENSION_LABEL: Record<string, string> = {
  autonomic: 'Système autonome',
  sleep: 'Sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

const DIMENSION_DESCRIPTION: Record<string, string> = {
  autonomic: 'VFC + FC repos',
  sleep: 'Architecture & qualité',
  subjective: 'RPE, stress, bien-être',
  loadContext: 'Charge aiguë vs chronique',
};

export function RecoveryDimensionsSection({
  dimensions,
}: {
  dimensions: Record<string, DimensionResult>;
}) {
  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Contribution au score</DrillDownSectionLabel>
      <div className="space-y-4">
        {Object.entries(dimensions).map(([key, dim]) => (
          <DrillDownDimensionRow
            key={key}
            description={DIMENSION_DESCRIPTION[key] ?? ''}
            dim={dim}
            label={DIMENSION_LABEL[key] ?? key}
          />
        ))}
      </div>
    </DrillDownSectionCard>
  );
}
