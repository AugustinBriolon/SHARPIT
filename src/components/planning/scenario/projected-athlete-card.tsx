'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { DiscussCoachLink } from '@/components/training/activity/discuss-coach-link';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';
import { cn } from '@/lib/utils';

const HORIZON_OPTIONS: { days: ProjectionHorizonDays; label: string }[] = [
  { days: 1, label: 'Demain' },
  { days: 3, label: '3 j' },
  { days: 7, label: '7 j' },
  { days: 14, label: '14 j' },
];

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
      className={cn('analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6', className)}
    >
      <div className="flex items-center gap-2">
        <GitBranch className="text-primary size-4 shrink-0" />
        <p className="text-label">Conseil du coach</p>
      </div>

      {valuesLoading ? (
        <Skeleton className="mt-3 h-6 w-full max-w-3xl rounded-full border-0 sm:h-7" />
      ) : (
        <p className="text-verdict text-foreground mt-3 max-w-3xl">
          {viewModel!.synthesisSentence}
        </p>
      )}

      {!valuesLoading && viewModel?.caution ? (
        <div className="rounded-analysis border-signal-caution/25 bg-signal-caution/8 mt-4 border px-3 py-3">
          <p className="text-label text-signal-caution">{viewModel.caution.label}</p>
          <p className="text-muted-foreground mt-1.5 max-w-3xl text-sm leading-relaxed">
            {viewModel.caution.body}
          </p>
        </div>
      ) : null}

      <div aria-label="Horizon de projection" className="mt-4 flex flex-wrap gap-1.5" role="group">
        {HORIZON_OPTIONS.map((option) => (
          <button
            key={option.days}
            aria-pressed={horizon === option.days}
            disabled={valuesLoading}
            type="button"
            className={cn(
              'focus-visible:ring-primary/30 min-h-11 rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden lg:min-h-9 lg:px-2.5 lg:py-1.5',
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

      <div className="mt-4">
        {valuesLoading ? (
          <Skeleton className="h-9 w-44 rounded-lg" />
        ) : (
          <DiscussCoachLink planningHorizon={horizon} />
        )}
      </div>
    </section>
  );
}
