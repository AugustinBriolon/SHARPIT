import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';

export function AcwrZoneBar({ acwr }: { acwr: number }) {
  const zones = [
    { label: 'Sous-charge', min: 0, max: 0.9, color: '#3b82f6' },
    { label: 'Optimal', min: 0.9, max: 1.3, color: '#10b981' },
    { label: 'Alerte', min: 1.3, max: 1.5, color: '#f59e0b' },
    { label: 'Danger', min: 1.5, max: 2.0, color: '#ef4444' },
  ];

  const totalRange = 2.0;
  const markerPct = Math.min((acwr / totalRange) * 100, 100);
  const activeZone = zones.find((z) => acwr >= z.min && acwr < z.max) ?? zones[zones.length - 1];

  return (
    <>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 flex h-3 w-full -translate-y-1/2 overflow-hidden rounded-full">
          {zones.map((z) => (
            <div
              key={z.label}
              className="h-full"
              style={{
                width: `${((z.max - z.min) / totalRange) * 100}%`,
                background: z.color,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute top-0 z-10 flex h-6 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: `${markerPct}%` }}
          aria-hidden
        >
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold text-white tabular-nums shadow-sm"
            style={{ backgroundColor: activeZone.color }}
          >
            {acwr.toFixed(2)}
          </span>
          <span
            className="h-full w-1 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: activeZone.color }}
          />
        </div>
      </div>
      <p className="mt-4 text-center text-sm font-medium" style={{ color: activeZone.color }}>
        {activeZone.label}
      </p>
    </>
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
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="dark:bg-muted/40 rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-muted-foreground text-[10px] font-medium uppercase">Charge 7j</p>
          <p className="mt-1 text-base font-semibold tabular-nums">
            {weeklyLoad > 0 ? `${weeklyLoad} TSS` : '—'}
          </p>
        </div>
        {chronicWeeklyAvg != null && (
          <div className="dark:bg-muted/40 rounded-2xl bg-slate-50 px-3 py-3">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">Base 42j</p>
            <p className="mt-1 text-base font-semibold tabular-nums">{chronicWeeklyAvg} TSS/sem</p>
          </div>
        )}
      </div>
    </DrillDownSectionCard>
  );
}
