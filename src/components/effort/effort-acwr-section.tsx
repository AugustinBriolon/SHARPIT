import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { cn } from '@/lib/utils';

const ZONES = [
  { label: 'Sous-charge', min: 0, max: 0.9, tone: 'muted' as const },
  { label: 'Optimal', min: 0.9, max: 1.3, tone: 'ok' as const },
  { label: 'Alerte', min: 1.3, max: 1.5, tone: 'caution' as const },
  { label: 'Danger', min: 1.5, max: 2.0, tone: 'risk' as const },
];

const TOTAL_RANGE = 2.0;

function zoneFill(tone: (typeof ZONES)[number]['tone']): string {
  switch (tone) {
    case 'ok':
      return 'var(--color-signal-base)';
    case 'caution':
      return 'var(--color-signal-caution)';
    case 'risk':
      return 'var(--color-signal-risk)';
    default:
      return 'var(--color-signal-neutral)';
  }
}

function zoneTextClass(tone: (typeof ZONES)[number]['tone']): string {
  switch (tone) {
    case 'caution':
      return 'text-signal-caution';
    case 'risk':
      return 'text-signal-risk';
    default:
      return 'text-muted-foreground';
  }
}

export function AcwrZoneBar({ acwr }: { acwr: number }) {
  const markerPct = Math.min((acwr / TOTAL_RANGE) * 100, 100);
  const activeZone = ZONES.find((z) => acwr >= z.min && acwr < z.max) ?? ZONES[ZONES.length - 1];

  return (
    <div className="space-y-2">
      <div className="relative h-1.5">
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          {ZONES.map((z) => (
            <div
              key={z.label}
              className="h-full opacity-45"
              style={{
                width: `${((z.max - z.min) / TOTAL_RANGE) * 100}%`,
                background: zoneFill(z.tone),
              }}
            />
          ))}
        </div>
        <div
          className="border-background absolute top-1/2 h-3.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            left: `${markerPct}%`,
            backgroundColor: zoneFill(activeZone.tone),
          }}
          aria-hidden
        />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn('text-[11px] leading-none', zoneTextClass(activeZone.tone))}>
          {activeZone.label}
        </p>
        <p className="text-data text-foreground text-sm font-semibold tabular-nums">
          {acwr.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export function EffortAcwrSection({
  acwr,
  weeklyLoad,
  chronicWeeklyAvg,
}: {
  acwr: number;
  weeklyLoad: number;
  chronicWeeklyAvg: number | null;
}) {
  if (acwr <= 0) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>ACWR</DrillDownSectionLabel>
      <AcwrZoneBar acwr={acwr} />
      <p className="text-muted-foreground/60 mt-3 text-[10px]">Gabbett 2016 · sweet spot 0.9–1.3</p>
      <ul className="divide-analysis-border/50 border-analysis-border/40 mt-4 divide-y border-t">
        <li className="flex items-baseline justify-between gap-4 py-3">
          <p className="text-foreground text-sm font-medium">Charge 7j</p>
          <p className="text-data text-foreground text-sm font-semibold tabular-nums">
            {weeklyLoad > 0 ? `${weeklyLoad} TSS` : '—'}
          </p>
        </li>
        {chronicWeeklyAvg != null ? (
          <li className="flex items-baseline justify-between gap-4 py-3">
            <p className="text-foreground text-sm font-medium">Base 42j</p>
            <p className="text-data text-foreground text-sm font-semibold tabular-nums">
              {chronicWeeklyAvg} TSS/sem
            </p>
          </li>
        ) : null}
      </ul>
    </DrillDownSectionCard>
  );
}
