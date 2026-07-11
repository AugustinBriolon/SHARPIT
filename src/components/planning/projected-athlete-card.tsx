'use client';

import { TrendingUp, AlertTriangle, CalendarRange } from 'lucide-react';
import { useState } from 'react';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';

const HORIZON_OPTIONS: { days: ProjectionHorizonDays; label: string }[] = [
  { days: 1, label: 'Demain' },
  { days: 3, label: '3 j' },
  { days: 7, label: '7 j' },
  { days: 14, label: '14 j' },
];

export function ProjectedAthleteCard({ className }: { className?: string }) {
  const [horizon, setHorizon] = useState<ProjectionHorizonDays>(7);
  const query = useProjectedAthleteViewModel(horizon);

  if (query.isLoading) {
    return (
      <Card className={cn('border-border/60', className)}>
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const viewModel = query.data;
  if (!viewModel?.visible) {
    if (!viewModel?.emptyStateMessage) return null;
    return (
      <Card className={cn('border-border/60', className)}>
        <CardContent className="p-5">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {viewModel.emptyStateMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="space-y-4 p-5">
        <ProjectedAthleteCardHeader
          horizon={horizon}
          viewModel={viewModel}
          onHorizonChange={setHorizon}
        />
        <ProjectedAthleteMetrics metrics={viewModel.metrics} />
        {viewModel.riskLines.length > 0 ? (
          <ProjectedAthleteRisks riskLines={viewModel.riskLines} />
        ) : null}
        {viewModel.horizonDaysPreview.length > 1 ? (
          <ProjectedAthleteTimeline days={viewModel.horizonDaysPreview} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProjectedAthleteCardHeader({
  horizon,
  viewModel,
  onHorizonChange,
}: {
  horizon: ProjectionHorizonDays;
  viewModel: ProjectedAthleteCardViewModel;
  onHorizonChange: (days: ProjectionHorizonDays) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="text-primary mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-label">Si tu exécutes ce plan</p>
            <p className="text-foreground mt-1 text-sm leading-relaxed font-medium">
              {viewModel.headline}
            </p>
          </div>
        </div>
        {viewModel.planningConfidenceLabel ? (
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {viewModel.planningConfidenceLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {HORIZON_OPTIONS.map((option) => (
          <button
            key={option.days}
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              horizon === option.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted',
            )}
            onClick={() => onHorizonChange(option.days)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {(viewModel.peakReadinessLabel || viewModel.highestRiskLabel) && (
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {viewModel.peakReadinessLabel ? (
            <span className="flex items-center gap-1">
              <CalendarRange className="size-3" />
              Pic readiness : {viewModel.peakReadinessLabel}
            </span>
          ) : null}
          {viewModel.highestRiskLabel ? (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="size-3" />
              Risque : {viewModel.highestRiskLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProjectedAthleteMetrics({
  metrics,
}: {
  metrics: ProjectedAthleteCardViewModel['metrics'];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="border-border/50 bg-muted/20 rounded-lg border px-3 py-2.5"
        >
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {metric.label}
          </p>
          <p className="text-foreground mt-0.5 text-sm font-semibold">{metric.value}</p>
          {metric.detail ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{metric.detail}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProjectedAthleteRisks({ riskLines }: { riskLines: readonly string[] }) {
  return (
    <ul className="space-y-1.5">
      {riskLines.map((line) => (
        <li
          key={line}
          className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed"
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
          {line}
        </li>
      ))}
    </ul>
  );
}

function ProjectedAthleteTimeline({
  days,
}: {
  days: ProjectedAthleteCardViewModel['horizonDaysPreview'];
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
        Jour par jour
      </p>
      <ul className="divide-border/50 divide-y rounded-lg border">
        {days.map((day) => (
          <li
            key={day.trainingDayId}
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs',
              day.isHighestRisk && 'bg-amber-500/5',
              day.isPeakReadiness && !day.isHighestRisk && 'bg-emerald-500/5',
            )}
          >
            <span className="text-foreground min-w-20 font-medium">{day.dateLabel}</span>
            <span className="text-muted-foreground">
              R {day.readiness ?? '—'} · F {day.fatigue ?? '—'} · A {day.adaptation ?? '—'}
            </span>
            <span className="text-muted-foreground">{day.verdictLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
