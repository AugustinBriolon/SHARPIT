import { restorativeRatioLabel, type SleepScoreBreakdown } from '@/lib/sleep-scoring';

export function SleepScoreExplainer({
  scoreBreakdown,
  sleepTargetMin,
}: {
  scoreBreakdown: SleepScoreBreakdown;
  sleepTargetMin: number;
}) {
  if (scoreBreakdown.sharpitScore == null) return null;

  const targetHours = Math.round((sleepTargetMin / 60) * 10) / 10;
  const parts: string[] = [];

  if (scoreBreakdown.durationScore != null) {
    parts.push(`durée ${scoreBreakdown.durationScore}% vs objectif ${targetHours} h`);
  }
  if (scoreBreakdown.restorativeRatio != null && scoreBreakdown.architectureScore != null) {
    parts.push(
      `architecture ${scoreBreakdown.architectureScore}% (${scoreBreakdown.restorativeRatio}% restaurateur, ${restorativeRatioLabel(scoreBreakdown.restorativeRatio)})`,
    );
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-muted-foreground text-center text-xs leading-relaxed">
      Score SHARPIT = 55 % durée + 45 % architecture — {parts.join(' · ')}.
    </p>
  );
}
