import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { SleepStageBreakdown } from '@/components/sleep/sleep-stage-breakdown';

export function SleepPhasesSection({
  deepMin,
  remMin,
  lightMin,
  awakeMin,
  totalMin,
}: {
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  totalMin: number;
}) {
  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Phases de sommeil</DrillDownSectionLabel>
      <SleepStageBreakdown
        awakeMin={awakeMin}
        deepMin={deepMin}
        lightMin={lightMin}
        remMin={remMin}
        totalMin={totalMin}
      />
    </DrillDownSectionCard>
  );
}
