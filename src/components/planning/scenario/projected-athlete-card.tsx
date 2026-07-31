'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';
import { cn } from '@/lib/utils';
import { GitBranch } from 'lucide-react';

const HORIZON_OPTIONS: { days: ProjectionHorizonDays; label: string }[] = [
  { days: 1, label: 'Demain' },
  { days: 3, label: '3 j' },
  { days: 7, label: '7 j' },
  { days: 14, label: '14 j' },
];

/**
 * Projected athlete trajectory for Planning — instrument Projection only.
 * Coach discussion lives on /coach (menu « Ma semaine » / discuss deep-links elsewhere).
 */
export function ProjectedAthleteCard({
  className,
  horizon,
  onHorizonChange,
  query,
}: {
  className?: string;
  horizon: ProjectionHorizonDays;
  onHorizonChange: (days: ProjectionHorizonDays) => void;
  query: UseQueryResult<ProjectedAthleteCardViewModel>;
}) {
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data;

  if (!valuesLoading && !viewModel?.visible) {
    if (!viewModel?.emptyStateMessage) return null;
    return (
      <InkEmptyState
        className={className}
        description={viewModel.emptyStateMessage}
        icon={GitBranch}
        title="Projection indisponible"
        compact
      />
    );
  }

  return (
    <section
      aria-busy={valuesLoading || undefined}
      className={cn('analysis-panel rounded-analysis-lg px-4 py-4 sm:px-5', className)}
    >
      <p className="text-label">Projection</p>

      {valuesLoading ? (
        <Skeleton className="mt-2 h-5 w-full max-w-2xl rounded-full border-0" />
      ) : (
        <p className="text-foreground mt-2 max-w-2xl text-sm leading-relaxed text-pretty">
          {viewModel!.synthesisSentence}
        </p>
      )}

      {!valuesLoading && viewModel?.caution ? (
        <div className="rounded-analysis border-signal-caution/25 bg-signal-caution/8 mt-3 border px-3 py-2.5">
          <p className="text-label text-signal-caution">{viewModel.caution.label}</p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-xs leading-relaxed text-pretty">
            {viewModel.caution.body}
          </p>
        </div>
      ) : null}

      <div aria-label="Horizon de projection" className="mt-3 flex flex-wrap gap-1.5" role="group">
        {HORIZON_OPTIONS.map((option) => (
          <button
            key={option.days}
            aria-pressed={horizon === option.days}
            disabled={valuesLoading}
            type="button"
            className={cn(
              'pressable focus-visible:ring-primary/30 min-h-11 rounded-md px-2.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-hidden lg:min-h-8',
              horizon === option.days
                ? 'bg-highlight text-highlight-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted',
              valuesLoading && 'opacity-70',
            )}
            onClick={() => onHorizonChange(option.days)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
