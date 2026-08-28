import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';
import { SplitsTable } from '@/components/training/activity/insights/splits-table';

export function RunSplitsSection({ analysis }: { analysis: ActivityAnalysis | null | undefined }) {
  const splits = analysis?.run?.splits ?? [];
  if (!splits.length) {
    return null;
  }
  return (
    <SplitsTable
      refPaceSecPerKm={analysis?.run?.avgPaceSecPerKm}
      splits={splits}
      title="Splits au kilomètre"
    />
  );
}

export function BikeSplitsSection({ analysis }: { analysis: ActivityAnalysis | null | undefined }) {
  const splits = analysis?.bike?.splits ?? [];
  if (!splits.length) {
    return null;
  }
  return <SplitsTable mode="bike" splits={splits} title="Splits tous les 5 km" />;
}
