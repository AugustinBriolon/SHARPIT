import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { TermInfo } from '@/components/ui/term-info';
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
      <div className="flex items-center gap-1.5">
        <DrillDownSectionLabel>D’où vient la charge du jour</DrillDownSectionLabel>
        <TermInfo term="strain" />
      </div>
      <p className="text-muted-foreground mb-4 flex items-center gap-1 text-xs">
        Entraînement, stress cardio et pas, ramenés à la même échelle
        <TermInfo term="tss" />
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
                <p className="text-muted-foreground text-xs tracking-wide">charge</p>
              </div>
            </div>
          );
        })}
      </div>
    </DrillDownSectionCard>
  );
}
