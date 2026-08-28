import { Sparkline } from '@/components/today/dashboard/sparkline';
import { formatDuration } from '@/lib/sleep/sleep';
import type { WeeklyStats } from '@/lib/weekly-review';
import type { WeeklyReviewIllustrationKind } from '@/components/training/weekly-review/weekly-review-sections';

function loadTrend(totalLoad: number, prevTotalLoad: number): string | undefined {
  if (prevTotalLoad <= 0) {
    return undefined;
  }
  const pct = Math.round(((totalLoad - prevTotalLoad) / prevTotalLoad) * 100);
  if (Math.abs(pct) < 5) {
    return '→ stable';
  }
  return pct > 0 ? `↗ +${pct}%` : `↘ ${pct}%`;
}

function TrainingIllustration({ stats }: { stats: WeeklyStats }) {
  return (
    <div className="mb-3 flex items-end gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-label">Charge de la semaine</span>
          <span className="text-data text-muted-foreground text-xs">
            {stats.totalLoad} {loadTrend(stats.totalLoad, stats.prevTotalLoad)}
          </span>
        </div>
        <div className="text-primary mt-1">
          <Sparkline h={28} stroke="currentColor" values={stats.dailyLoad ?? []} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-label block">Séances</span>
        <span className="text-data text-sm">
          {stats.sessionsCompleted}/{stats.sessionsPlanned}
        </span>
      </div>
    </div>
  );
}

function SleepIllustration({ stats }: { stats: WeeklyStats }) {
  return (
    <div className="mb-3 flex items-end gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-label">Sommeil, nuit par nuit</span>
          <span className="text-data text-muted-foreground text-xs">
            {formatDuration(stats.sleep.avgDurationMin)} en moyenne
          </span>
        </div>
        <div className="text-primary mt-1">
          <Sparkline h={28} stroke="currentColor" values={stats.dailySleepScore ?? []} />
        </div>
      </div>
      {stats.recovery.avgReadiness !== null ? (
        <div className="shrink-0 text-right">
          <span className="text-label block">Récup</span>
          <span className="text-data text-sm">{Math.round(stats.recovery.avgReadiness)}/100</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The chart that illustrates the section it sits above — not a detached stat
 * dump. Only renders when the section actually has a matching kind AND the
 * underlying series has enough points; otherwise the section just reads as
 * plain text, no broken/empty chart.
 */
export function WeeklyReviewIllustration({
  kind,
  stats,
}: {
  kind: WeeklyReviewIllustrationKind;
  stats: WeeklyStats;
}) {
  if (kind === 'training') {
    return <TrainingIllustration stats={stats} />;
  }
  return <SleepIllustration stats={stats} />;
}
