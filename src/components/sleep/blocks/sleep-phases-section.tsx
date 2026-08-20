import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { SleepStageBreakdown } from '@/components/sleep/blocks/sleep-stage-breakdown';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Night structure — stages bar + legend.
 * When paired with a why panel: coach/why first on mobile, structure left on desktop.
 */
export function SleepPhasesSection({
  deepMin,
  remMin,
  lightMin,
  awakeMin,
  totalMin,
  whyPanel,
}: {
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  totalMin: number;
  whyPanel?: ReactNode;
}) {
  const structure = (
    <DrillDownSectionCard className="h-full">
      <DrillDownSectionLabel>Structure de la nuit</DrillDownSectionLabel>
      <SleepStageBreakdown
        awakeMin={awakeMin}
        deepMin={deepMin}
        lightMin={lightMin}
        remMin={remMin}
        totalMin={totalMin}
      />
    </DrillDownSectionCard>
  );

  if (!whyPanel) return structure;

  return (
    <div className={cn('grid gap-4', 'lg:grid-cols-2 lg:items-stretch')}>
      <div className="order-1 lg:order-2">{whyPanel}</div>
      <div className="order-2 lg:order-1">{structure}</div>
    </div>
  );
}
