import { formatSleepDuration } from '@/lib/sleep-scoring';
import { cn } from '@/lib/utils';

const STAGE_STYLES = {
  deep: {
    color: 'var(--color-signal-recovery)',
    label: 'Profond',
    ideal: '13–23 %',
    low: 13,
    high: 23,
  },
  rem: {
    color: 'var(--color-signal-vo2)',
    label: 'Paradoxal',
    ideal: '20–25 %',
    low: 20,
    high: 25,
  },
  light: {
    color: 'var(--color-signal-base)',
    label: 'Léger',
    ideal: null,
    low: null,
    high: null,
  },
  awake: {
    color: 'var(--color-signal-caution)',
    label: 'Éveillé',
    ideal: null,
    low: null,
    high: null,
  },
} as const;

type StageKey = keyof typeof STAGE_STYLES;

type StageRow = {
  key: StageKey;
  minutes: number;
  percent: number;
};

function buildStageRows(
  deepMin: number | null,
  remMin: number | null,
  lightMin: number | null,
  awakeMin: number | null,
  totalMin: number,
): StageRow[] {
  const entries: { key: StageKey; minutes: number | null }[] = [
    { key: 'deep', minutes: deepMin },
    { key: 'rem', minutes: remMin },
    { key: 'light', minutes: lightMin },
    { key: 'awake', minutes: awakeMin },
  ];

  return entries
    .filter((e) => e.minutes != null && e.minutes > 0)
    .map((e) => ({
      key: e.key,
      minutes: e.minutes!,
      percent: Math.round((e.minutes! / totalMin) * 100),
    }));
}

/** La couleur ne signale que l'écart — une phase dans la norme reste neutre. */
function stageStatus(key: StageKey, percent: number): { label: string; className: string } | null {
  const style = STAGE_STYLES[key];
  if (style.low == null || style.high == null) return null;
  if (percent < style.low) {
    return { label: 'sous la norme', className: 'text-signal-caution' };
  }
  if (percent > style.high) {
    return { label: 'au-dessus de la norme', className: 'text-muted-foreground/70' };
  }
  return { label: 'dans la norme', className: 'text-muted-foreground/70' };
}

export function SleepStageBreakdown({
  deepMin,
  remMin,
  lightMin,
  awakeMin,
  totalMin,
}: {
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  totalMin: number;
}) {
  const rows = buildStageRows(deepMin, remMin, lightMin, awakeMin, totalMin);
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Phases indisponibles — synchronise ta montre Garmin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full">
        {rows.map((row) => (
          <div
            key={row.key}
            className="h-full opacity-80 transition-all first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${row.percent}%`,
              backgroundColor: STAGE_STYLES[row.key].color,
            }}
          />
        ))}
      </div>
      <ul className="border-analysis-border/60 divide-y">
        {rows.map((row) => {
          const style = STAGE_STYLES[row.key];
          const status = stageStatus(row.key, row.percent);
          return (
            <li key={row.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: style.color }}
              />
              <div className="min-w-0 flex-1">
                <span className="text-foreground text-sm font-medium">{style.label}</span>
                {status ? (
                  <p className={cn('text-[10px] leading-snug', status.className)}>{status.label}</p>
                ) : null}
              </div>
              <span className="text-data text-sm font-semibold tabular-nums">
                {formatSleepDuration(row.minutes)}
              </span>
              <span className="text-muted-foreground w-10 text-right text-sm tabular-nums">
                {row.percent}%
              </span>
              {style.ideal ? (
                <span className="text-muted-foreground hidden w-16 text-right text-[10px] sm:block">
                  {style.ideal}
                </span>
              ) : (
                <span className="text-muted-foreground hidden w-16 text-right text-[10px] sm:block">
                  —
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
