import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { DimensionResult } from '@/hooks/use-today';
import { mapFatigueDimensionIntensity } from '@/lib/today/today-mapping';

const DIMENSION_LABEL: Record<string, string> = {
  load: "Charge d'entraînement",
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Cumulative',
  psychological: 'Psychologique',
};

const DIMENSION_DESCRIPTION: Record<string, string> = {
  load: 'TSS, ACWR, tendance',
  neuromuscular: 'Force, vitesse, récupération musculaire',
  metabolic: 'Volume intensité, dette lactique',
  cumulative: 'Accumulation multi-semaines',
  psychological: 'Stress, motivation, charge mentale',
};

export function EffortDimensionsSection({
  dimensions,
  missingCount,
  loading = false,
}: {
  dimensions: Record<string, DimensionResult>;
  missingCount: number;
  loading?: boolean;
}) {
  const entries = Object.keys(DIMENSION_LABEL).map((key) => [
    key,
    dimensions[key] ?? { score: null, status: 'PENDING', available: false },
  ]) as [string, DimensionResult][];

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Détail par dimension</DrillDownSectionLabel>
      <p className="text-muted-foreground mb-4 text-xs">
        Fatigue par axe (0 = très faible, 100 = maximale). Un score bas est positif lorsque tu es
        frais.
      </p>
      <div className="space-y-4">
        {entries.map(([key, dim]) => (
          <DrillDownDimensionRow
            key={key}
            description={DIMENSION_DESCRIPTION[key] ?? ''}
            dim={dim}
            label={DIMENSION_LABEL[key] ?? key}
            loading={loading}
            intensityLabel={
              !loading && dim.available && dim.score !== null
                ? mapFatigueDimensionIntensity(dim.score)
                : undefined
            }
            higherIsWorse
          />
        ))}
      </div>
      {!loading && missingCount > 0 && (
        <p className="text-muted-foreground/60 mt-3 text-[10px]">
          {missingCount} dimension{missingCount > 1 ? 's' : ''} sans signal fiable (données
          d&apos;entraînement ou subjectives absentes).
        </p>
      )}
    </DrillDownSectionCard>
  );
}
