import { subDays, isSameDay } from 'date-fns';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
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
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  const numSeries = (key: keyof ClientHealthEntry) =>
    last7.map((d) => {
      const e = entries.find((en) => isSameDay(new Date(en.date), d));
      if (!e) return null;
      const v = e[key];
      return typeof v === 'number' ? v : null;
    });

  const hrvBaselineContext = (() => {
    const hrv = entry?.hrv;
    const low = entry?.hrvBaselineLow;
    const high = entry?.hrvBaselineHigh;
    if (hrv == null || low == null || high == null) return null;
    if (hrv < low)
      return {
        label: `↓ sous base (${low}–${high})`,
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    if (hrv > high)
      return {
        label: `↑ au-dessus (${low}–${high})`,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    return { label: `→ norme (${low}–${high} ms)`, colorClass: 'text-slate-400' };
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
      stroke: '#64748b',
    },
    {
      label: 'VFC',
      value: entry?.hrv != null ? `${entry.hrv} ms` : '—',
      data: numSeries('hrv'),
      stroke: '#10b981',
      context: hrvBaselineContext,
    },
    {
      label: 'Body Battery',
      value: entry?.bodyBattery != null ? `${entry.bodyBattery}` : '—',
      data: numSeries('bodyBattery'),
      stroke: '#8b5cf6',
    },
    {
      label: 'Stress',
      value: entry?.stress != null ? String(entry.stress) : '—',
      data: numSeries('stress'),
      stroke: '#f59e0b',
    },
    {
      label: 'Poids',
      value: entry?.weightKg != null ? `${entry.weightKg.toFixed(1)} kg` : '—',
      data: numSeries('weightKg'),
      stroke: '#3b82f6',
    },
    {
      label: 'Respiration',
      value: entry?.sleepRespiration != null ? `${entry.sleepRespiration.toFixed(1)} r/m` : '—',
      data: numSeries('sleepRespiration'),
      stroke: '#06b6d4',
    },
  ];

  const visible = metrics.filter((m) => m.value !== '—' || m.data.some((v) => v !== null));

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <EyebrowLabel className="mb-4" variant="dashboard">
        Moniteur de santé
      </EyebrowLabel>
      <div className="space-y-1 lg:space-y-3">
        {visible.map((m) => (
          <div
            key={m.label}
            className="flex min-h-11 items-center gap-3 rounded-lg px-1 py-1 lg:min-h-0 lg:rounded-none lg:px-0 lg:py-0"
          >
            <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {m.label}
            </span>
            <div className="min-w-0 flex-1">
              <div className="h-5">
                <Sparkline h={20} stroke={m.stroke} values={m.data} />
              </div>
            </div>
            <div className="flex w-20 shrink-0 flex-col items-end">
              <span className="text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                {m.value}
              </span>
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
