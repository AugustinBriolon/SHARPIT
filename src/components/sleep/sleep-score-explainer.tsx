import { restorativeRatioLabel, type SleepScoreBreakdown } from '@/lib/sleep-scoring';

export function SleepScoreExplainer({
  scoreBreakdown,
  garminScore,
}: {
  scoreBreakdown: SleepScoreBreakdown;
  garminScore: number | null;
}) {
  if (scoreBreakdown.restorativeRatio == null) return null;

  return (
    <p className="text-muted-foreground text-center text-xs leading-relaxed">
      Score SHARPIT basé sur{' '}
      <span className="text-foreground font-medium">
        {scoreBreakdown.restorativeRatio} % restaurateur
      </span>{' '}
      ({restorativeRatioLabel(scoreBreakdown.restorativeRatio)}).
      {garminScore != null &&
        ` Garmin (${garminScore}) intègre aussi la durée et les interruptions.`}
    </p>
  );
}
