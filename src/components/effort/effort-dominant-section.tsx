import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { resolveCode } from '@/lib/french';
import { cn } from '@/lib/utils';

const DOMINANT_LABEL: Record<string, string> = {
  LOAD: 'Charge excessive',
  NEUROMUSCULAR: 'Fatigue neuromusculaire',
  METABOLIC: 'Fatigue métabolique',
  CUMULATIVE: 'Accumulation chronique',
  PSYCHOLOGICAL: 'Fatigue psychologique',
  load: 'Charge excessive',
  neuromuscular: 'Fatigue neuromusculaire',
  metabolic: 'Fatigue métabolique',
  cumulative: 'Accumulation chronique',
  psychological: 'Fatigue psychologique',
};

const DOMINANT_LABEL_LOW: Record<string, string> = {
  LOAD: 'Charge actuelle',
  NEUROMUSCULAR: 'Neuromusculaire',
  METABOLIC: 'Métabolique',
  CUMULATIVE: 'Historique de charge',
  PSYCHOLOGICAL: 'Psychologique',
  load: 'Charge actuelle',
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Historique de charge',
  psychological: 'Psychologique',
};

export function EffortDominantSection({
  dominantDimension,
  primaryLimitingFactor,
  isLowFatigue,
}: {
  dominantDimension: string | null;
  primaryLimitingFactor: string | null;
  isLowFatigue: boolean;
}) {
  if (!dominantDimension) return null;

  const labelMap = isLowFatigue ? DOMINANT_LABEL_LOW : DOMINANT_LABEL;

  return (
    <DrillDownSectionCard
      className={!isLowFatigue ? 'border border-amber-500/20 bg-amber-500/5 ring-0' : undefined}
    >
      <DrillDownSectionLabel>
        {isLowFatigue ? 'Systeme a surveiller' : 'Systeme qui paie le plus'}
      </DrillDownSectionLabel>
      <p className={cn('text-lg font-semibold', !isLowFatigue && 'text-amber-700')}>
        {labelMap[dominantDimension] ?? dominantDimension}
      </p>
      {primaryLimitingFactor && (
        <p className="text-muted-foreground mt-1 text-sm">{resolveCode(primaryLimitingFactor)}</p>
      )}
    </DrillDownSectionCard>
  );
}
