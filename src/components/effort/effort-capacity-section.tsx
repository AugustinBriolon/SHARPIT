import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { mapFatigueCapacityLabel, type TrainingCapacity } from '@/lib/today-mapping';

export function EffortCapacitySection({
  trainingCapacity,
}: {
  trainingCapacity: TrainingCapacity;
}) {
  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Capacité d&apos;entraînement</DrillDownSectionLabel>
      <p className="text-lg font-semibold">{mapFatigueCapacityLabel(trainingCapacity)}</p>
    </DrillDownSectionCard>
  );
}
