'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { DiscussCoachLink } from '@/components/training/discuss-coach-link';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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
  if (query.isLoading) {
    return (
      <section
        className={cn('analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6', className)}
      >
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-3 w-28 rounded-full border-0" />
        </div>
        <Skeleton className="mt-3 h-6 w-full max-w-3xl rounded-full border-0 sm:h-7" />
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-12 rounded-md" />
          ))}
        </div>
        <Skeleton className="mt-4 h-9 w-44 rounded-lg" />
      </section>
    );
  }

  const viewModel = query.data;
  if (!viewModel?.visible) {
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
    <section className={cn('analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6', className)}>
      <div className="flex items-center gap-2">
        <GitBranch className="text-primary size-4 shrink-0" />
        <p className="text-label">Conseil du coach</p>
      </div>

      <p className="text-verdict text-foreground mt-3 max-w-3xl">{viewModel.synthesisSentence}</p>

      <div aria-label="Horizon de projection" className="mt-4 flex flex-wrap gap-1.5" role="group">
        {HORIZON_OPTIONS.map((option) => (
          <button
            key={option.days}
            aria-pressed={horizon === option.days}
            type="button"
            className={cn(
              'focus-visible:ring-primary/30 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              horizon === option.days
                ? 'bg-highlight text-highlight-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted',
            )}
            onClick={() => onHorizonChange(option.days)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <DiscussCoachLink planningHorizon={horizon} />
      </div>
    </section>
  );
}
