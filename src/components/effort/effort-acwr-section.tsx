import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';

const ZONES = [
  { label: 'Sous-charge', min: 0, max: 0.9, tone: 'muted' as const },
  { label: 'Optimal', min: 0.9, max: 1.3, tone: 'ok' as const },
  { label: 'Alerte', min: 1.3, max: 1.5, tone: 'caution' as const },
  { label: 'Danger', min: 1.5, max: 2.0, tone: 'risk' as const },
];

const TOTAL_RANGE = 2.0;
/** Sweet-spot edges shown as ticks on the rail. */
const TICKS = [0.9, 1.3] as const;

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

function pctOnRail(value: number): number {
  return Math.max(0, Math.min(100, (value / TOTAL_RANGE) * 100));
}

/**
 * ACWR position rail — zone colors + marker + scale ticks.
 * Caller owns the ACWR label / value header above the rail.
 */
export function AcwrZoneBar({ acwr }: { acwr: number }) {
  const markerPct = pctOnRail(acwr);
  const activeZone = ZONES.find((z) => acwr >= z.min && acwr < z.max) ?? ZONES[ZONES.length - 1];
  const markerColor = zoneFill(activeZone.tone);

  return (
    <div className="space-y-1.5">
      {/* Extra vertical room so the marker is never clipped */}
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 flex h-1.5 -translate-y-1/2 overflow-hidden rounded-full">
          {ZONES.map((z) => (
            <div
              key={z.label}
              className="h-full opacity-50"
              style={{
                width: `${((z.max - z.min) / TOTAL_RANGE) * 100}%`,
                background: zoneFill(z.tone),
              }}
            />
          ))}
        </div>

        {TICKS.map((tick) => (
          <div
            key={tick}
            className="bg-foreground/35 absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pctOnRail(tick)}%` }}
            aria-hidden
          />
        ))}

        {/* Position marker — disk + stem, above the track */}
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${markerPct}%` }}
          aria-hidden
        >
          <div
            className="border-background size-3 rounded-full border-2 shadow-sm"
            style={{ backgroundColor: markerColor }}
          />
        </div>
      </div>

      <div className="text-muted-foreground flex justify-between text-[10px] tabular-nums">
        <span>0</span>
        <span>0.9</span>
        <span>1.3</span>
        <span>2+</span>
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
