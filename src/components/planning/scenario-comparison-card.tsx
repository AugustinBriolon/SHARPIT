'use client';

import { GitCompare, Sparkles } from 'lucide-react';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useScenarioComparisonViewModel } from '@/hooks/use-scenario-comparison-view-model';

export function ScenarioComparisonCard({ className }: { className?: string }) {
  const query = useScenarioComparisonViewModel(7);

  if (query.isLoading) {
    return (
      <Card className={cn('border-border/60', className)}>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-20 w-full rounded-lg" />
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
          <p className="text-muted-foreground text-sm">{viewModel.emptyStateMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="space-y-4 p-5">
        <ScenarioComparisonHeader viewModel={viewModel} />
        <ScenarioComparisonList scenarios={viewModel.scenarios} />
      </CardContent>
    </Card>
  );
}

function ScenarioComparisonHeader({ viewModel }: { viewModel: ScenarioComparisonViewModel }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <GitCompare className="text-primary mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-label">Comparer les alternatives</p>
          {viewModel.anchorDecisionDomain ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Facteur limitant : {viewModel.anchorDecisionDomain}
              {viewModel.focusSessionLabel ? ` · ${viewModel.focusSessionLabel}` : ''}
            </p>
          ) : viewModel.focusSessionLabel ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Autour de : {viewModel.focusSessionLabel}
            </p>
          ) : null}
          <p className="text-foreground mt-1 text-sm leading-relaxed font-medium">
            {viewModel.recommendation}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {viewModel.recommendationRationale}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScenarioComparisonList({
  scenarios,
}: {
  scenarios: ScenarioComparisonViewModel['scenarios'];
}) {
  return (
    <ul className="space-y-2">
      {scenarios.map((scenario) => (
        <li
          key={scenario.scenarioId}
          className={cn(
            'border-border/50 rounded-lg border px-3 py-2.5',
            scenario.isRecommended && 'border-primary/40 bg-primary/5',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
              {scenario.isRecommended ? (
                <Sparkles className="text-primary size-3.5 shrink-0" />
              ) : null}
              {scenario.label}
            </p>
            <span className="text-muted-foreground shrink-0 text-[11px]">
              {scenario.endVerdict}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{scenario.rationale}</p>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <span>Readiness {scenario.endReadiness ?? '—'}</span>
            <span>Adaptation {scenario.endAdaptation ?? '—'}</span>
            <span>Env. {scenario.environmentalImpact}</span>
            {scenario.endConfidenceLabel ? <span>Conf. {scenario.endConfidenceLabel}</span> : null}
            {scenario.limitingFactor ? <span>{scenario.limitingFactor}</span> : null}
          </div>
          {scenario.preferabilityExplanation && !scenario.isBaseline ? (
            <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">
              {scenario.preferabilityExplanation}
            </p>
          ) : null}
          {scenario.tradeOffs.length > 0 ? (
            <p className="text-muted-foreground mt-1 text-[11px]">
              {scenario.tradeOffs.join(' · ')}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
