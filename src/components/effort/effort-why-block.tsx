import { PhysioDomainWhy } from '@/components/today/drill-down/physio-domain-why';
import {
  explainTsb,
  synthesizeLoadReading,
  synthesizeLoadReadingPlain,
} from '@/lib/effort/load-reading';
import type { TrainingCapacity } from '@/lib/today/today-mapping';

/**
 * Charge why — plain French primary; acronyms only in expand.
 */
export function EffortWhyBlock({
  verdictKey,
  trainingCapacity,
  acwr,
  weeklyLoad,
  chronicWeeklyAvg,
  tsb,
  loading = false,
}: {
  verdictKey: string;
  trainingCapacity: TrainingCapacity;
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
  tsb: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return <PhysioDomainWhy label="Lecture" primary={null} loading />;
  }

  if (acwr <= 0 && weeklyLoad <= 0) {
    return null;
  }

  if (acwr <= 0) {
    return (
      <PhysioDomainWhy
        label="Lecture"
        primary={`Charge aiguë ${weeklyLoad} TSS sur 7 j — ratio de montée indisponible.`}
      />
    );
  }

  const input = {
    verdictKey,
    acwr,
    weeklyLoad,
    chronicWeeklyAvg,
    tsb,
    trainingCapacity,
  };

  const supporting: string[] = [synthesizeLoadReading(input)];
  const tsbLine = explainTsb(tsb);
  if (tsbLine) supporting.push(tsbLine);

  return (
    <PhysioDomainWhy
      label="Lecture"
      primary={synthesizeLoadReadingPlain(input)}
      supportingLines={supporting}
    />
  );
}
