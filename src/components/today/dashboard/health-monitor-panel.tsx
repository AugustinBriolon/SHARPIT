import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import {
  CHART_CAUTION_STROKE,
  CHART_RECOVERY_STROKE,
  CHART_TEMPO_STROKE,
  CHART_TICK_COLOR,
  CHART_VO2_STROKE,
} from '@/lib/chart-theme';
import { buildDailyWindowSeries, indexHealthEntriesByDay } from '@/lib/health';
import { cn } from '@/lib/utils';
import type { ClientHealthEntry } from '@/lib/query/types';
import { Sparkline } from './sparkline';

export function HealthMonitorPanel({
  entry,
  entries,
}: {
  entry: ClientHealthEntry | null;
  entries: ClientHealthEntry[];
}) {
  const today = new Date();
  const healthByDay = indexHealthEntriesByDay(entries);

  const numSeries = (key: keyof ClientHealthEntry) =>
    buildDailyWindowSeries(
      healthByDay,
      7,
      (_d, e) => {
        if (!e) return null;
        const v = e[key];
        return typeof v === 'number' ? v : null;
      },
      today,
    );

  const hrvBaselineContext = (() => {
    const hrv = entry?.hrv;
    const low = entry?.hrvBaselineLow;
    const high = entry?.hrvBaselineHigh;
    if (hrv == null || low == null || high == null) return null;
    if (hrv < low)
      return {
        label: `↓ sous base (${low}–${high})`,
        colorClass: 'text-signal-caution',
      };
    if (hrv > high)
      return {
        label: `↑ au-dessus (${low}–${high})`,
        colorClass: 'text-primary',
      };
    return { label: `→ norme (${low}–${high} ms)`, colorClass: 'text-muted-foreground' };
  })();

  const metrics: {
    label: string;
    value: string;
    data: (number | null)[];
    stroke: string;
    context?: { label: string; colorClass: string } | null;
  }[] = [
    {
      label: 'FC repos',
      value: entry?.restingHr != null ? `${entry.restingHr} bpm` : '—',
      data: numSeries('restingHr'),
      stroke: CHART_TICK_COLOR,
    },
    {
      label: 'VFC',
      value: entry?.hrv != null ? `${entry.hrv} ms` : '—',
      data: numSeries('hrv'),
      stroke: CHART_RECOVERY_STROKE,
      context: hrvBaselineContext,
    },
    {
      label: 'Body Battery',
      value: entry?.bodyBattery != null ? `${entry.bodyBattery}` : '—',
      data: numSeries('bodyBattery'),
      stroke: CHART_VO2_STROKE,
    },
    {
      label: 'Stress',
      value: entry?.stress != null ? String(entry.stress) : '—',
      data: numSeries('stress'),
      stroke: CHART_CAUTION_STROKE,
    },
    {
      label: 'Poids',
      value: entry?.weightKg != null ? `${entry.weightKg.toFixed(1)} kg` : '—',
      data: numSeries('weightKg'),
      stroke: CHART_TEMPO_STROKE,
    },
    {
      label: 'Respiration',
      value: entry?.sleepRespiration != null ? `${entry.sleepRespiration.toFixed(1)} r/m` : '—',
      data: numSeries('sleepRespiration'),
      stroke: CHART_RECOVERY_STROKE,
    },
  ];

  const visible = metrics.filter((m) => m.value !== '—' || m.data.some((v) => v !== null));

  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col px-5 py-5">
      <EyebrowLabel className="mb-4" variant="dashboard">
        Moniteur de santé
      </EyebrowLabel>
      <div className="space-y-1 lg:space-y-3">
        {visible.map((m) => (
          <div
            key={m.label}
            className="flex min-h-11 items-center gap-3 rounded-lg px-1 py-1 lg:min-h-0 lg:rounded-none lg:px-0 lg:py-0"
          >
            <span className="text-muted-foreground w-24 shrink-0 text-xs">{m.label}</span>
            <div className="min-w-0 flex-1">
              <div className="h-5">
                <Sparkline h={20} stroke={m.stroke} values={m.data} />
              </div>
            </div>
            <div className="flex w-20 shrink-0 flex-col items-end">
              <span className="text-foreground text-xs font-semibold tabular-nums">{m.value}</span>
              {m.context && (
                <span className={cn('text-[9px] font-medium', m.context.colorClass)}>
                  {m.context.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
