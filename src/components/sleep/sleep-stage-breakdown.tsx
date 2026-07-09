import { formatSleepDuration } from '@/lib/sleep-scoring';

const STAGE_STYLES = {
  deep: {
    color: 'var(--color-signal-recovery)',
    label: 'Profond',
    ideal: '13–23 %',
  },
  rem: {
    color: 'var(--color-signal-vo2)',
    label: 'Paradoxal',
    ideal: '20–25 %',
  },
  light: {
    color: 'var(--color-signal-base)',
    label: 'Léger',
    ideal: null,
  },
  awake: {
    color: 'var(--color-signal-caution)',
    label: 'Éveillé',
    ideal: null,
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
      <div className="bg-muted/50 rounded-analysis flex h-10 w-full overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.key}
            className="h-full transition-all"
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
          return (
            <li key={row.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: style.color }}
              />
              <span className="text-foreground flex-1 text-sm font-medium">{style.label}</span>
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
