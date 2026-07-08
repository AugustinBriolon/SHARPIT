import { formatClock, formatDuration, type SleepCoachView } from '@/lib/sleep';
import { buildSleepInsightBundle } from '@/core/product-insight/sleep-insights';

export function buildSleepPageInsights(params: {
  sleepScore: number | null;
  adequacyLabel: string;
  targetDeltaMin: number | null;
  sleepDelta7d: number | null;
  recoveryNote: string | null;
  coachView: SleepCoachView;
  confidence?: number;
}) {
  const { coachView } = params;

  return buildSleepInsightBundle({
    sleepScore: params.sleepScore,
    adequacyLabel: params.adequacyLabel,
    targetDeltaMin: params.targetDeltaMin,
    sleepDelta7d: params.sleepDelta7d,
    recoveryNote: params.recoveryNote,
    recommendedBedtime: formatClock(coachView.recommendedBedtimeMin),
    recommendedDurationLabel: formatDuration(coachView.recommendedDurationMin),
    debt7Min: coachView.debt7Min,
    regularityMin: coachView.regularityMin,
    coachInsightLines: coachView.insights.map((insight) => `${insight.title} — ${insight.detail}`),
    confidence: params.confidence ?? 0.75,
  });
}
