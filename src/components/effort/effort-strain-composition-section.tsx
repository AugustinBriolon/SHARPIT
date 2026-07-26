import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { EffortStrainCompositionView } from '@/lib/presentation/effort-strain-composition';
import { cn } from '@/lib/utils';

export function EffortStrainCompositionSection({
  composition,
  loading = false,
}: {
  composition: EffortStrainCompositionView;
  loading?: boolean;
}) {
  if (!loading && !composition.available) return null;

  return (
    <DrillDownSectionCard>
      <DrillDownSectionLabel>Composition du jour</DrillDownSectionLabel>
      <p className="text-muted-foreground mb-4 text-xs">
        Contribution à la charge du jour (unités TSS-équivalentes) : entraînement, stress / Body
        Battery Garmin, et pas.
      </p>
      <div className="space-y-4">
        {composition.contributors.map((row) => {
          const isDominant = composition.dominantKey === row.key;
          return (
            <div key={row.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    !loading && !row.available && 'text-muted-foreground/50',
                  )}
                >
                  {row.label}
                  {isDominant && row.available ? (
                    <span className="text-label text-muted-foreground ml-2 font-normal">
                      dominant
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">{row.description}</p>
              </div>
              <div className="shrink-0 text-right">
                {loading ? <SkeletonDataValue heightClassName="h-4" widthClassName="w-10" /> : null}
                {!loading && row.available && row.load != null ? (
                  <p className="text-data text-sm tabular-nums">{row.load}</p>
                ) : null}
                {!loading && !(row.available && row.load != null) ? (
                  <p className="text-muted-foreground/40 text-sm">—</p>
                ) : null}
                <p className="text-muted-foreground text-[10px] tracking-wide">charge</p>
              </div>
            </div>
          );
        })}
      </div>
    </DrillDownSectionCard>
  );
}
