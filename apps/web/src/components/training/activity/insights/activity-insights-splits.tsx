import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';
import { RhythmSplits } from '@/components/training/activity/reading/rhythm-splits';

export function RunSplitsSection({ analysis }: { analysis: ActivityAnalysis | null | undefined }) {
  const splits = analysis?.run?.splits ?? [];
  if (!splits.length) {
    return null;
  }
  return (
    <RhythmSplits
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
  return <RhythmSplits mode="bike" splits={splits} title="Splits tous les 5 km" />;
}
