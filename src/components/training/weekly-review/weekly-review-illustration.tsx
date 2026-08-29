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
  const trend = loadTrend(stats.totalLoad, stats.prevTotalLoad);
  return (
    <div className="mb-3 flex items-end gap-4">
      <div className="min-w-0 flex-1">
        <span className="text-label">Charge de la semaine</span>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-data text-foreground text-xl font-semibold">{stats.totalLoad}</span>
          {trend ? <span className="text-data text-muted-foreground text-xs">{trend}</span> : null}
        </div>
        <div className="text-primary mt-1.5">
          <Sparkline
            fillOpacity={0.2}
            h={36}
            stroke="currentColor"
            strokeWidth={2.5}
            values={stats.dailyLoad ?? []}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-label block">Séances</span>
        <span className="text-data text-foreground text-xl font-semibold">
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
        <span className="text-label">Sommeil, nuit par nuit</span>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-data text-foreground text-xl font-semibold">
            {formatDuration(stats.sleep.avgDurationMin)}
          </span>
          <span className="text-muted-foreground text-xs">en moyenne</span>
        </div>
        <div className="text-primary mt-1.5">
          <Sparkline
            fillOpacity={0.2}
            h={36}
            stroke="currentColor"
            strokeWidth={2.5}
            values={stats.dailySleepScore ?? []}
          />
        </div>
      </div>
      {stats.recovery.avgReadiness !== null ? (
        <div className="shrink-0 text-right">
          <span className="text-label block">Récup</span>
          <span className="text-data text-foreground text-xl font-semibold">
            {Math.round(stats.recovery.avgReadiness)}/100
          </span>
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
