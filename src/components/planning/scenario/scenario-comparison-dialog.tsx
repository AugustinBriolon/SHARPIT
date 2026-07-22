'use client';

import { GitCompare, Sparkles } from 'lucide-react';
import type {
  ScenarioComparisonViewModel,
  ScenarioTechnicalDetail,
} from '@/core/presentation/scenario-comparison-view-model';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ScenarioComparisonDialog({
  open,
  onClose,
  viewModel,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  viewModel: ScenarioComparisonViewModel | undefined;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="text-primary size-4 shrink-0" />
            Comparer les alternatives
          </DialogTitle>
          <DialogDescription>
            Scénarios explorés par le moteur de projection — recommandation hors plan actuel.
          </DialogDescription>
        </DialogHeader>

        <ScenarioComparisonBody isLoading={isLoading} viewModel={viewModel} />
      </DialogContent>
    </Dialog>
  );
}

function ScenarioComparisonBody({
  isLoading,
  viewModel,
}: {
  isLoading: boolean;
  viewModel: ScenarioComparisonViewModel | undefined;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (viewModel?.visible) {
    return (
      <div className="space-y-4">
        <ScenarioComparisonHeader viewModel={viewModel} />
        <ScenarioComparisonList scenarios={viewModel.scenarios} />
        <ScenarioTechnicalDetails scenarios={viewModel.scenarios} />
      </div>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      Aucune alternative strictement meilleure que le plan actuel sur cet horizon.
    </p>
  );
}

function focusContextLine(viewModel: ScenarioComparisonViewModel): string | null {
  if (viewModel.anchorDecisionDomain) {
    const session = viewModel.focusSessionLabel ? ` · ${viewModel.focusSessionLabel}` : '';
    return `Facteur limitant : ${viewModel.anchorDecisionDomain}${session}`;
  }
  if (viewModel.focusSessionLabel) {
    return `Autour de : ${viewModel.focusSessionLabel}`;
  }
  return null;
}

function ScenarioComparisonHeader({ viewModel }: { viewModel: ScenarioComparisonViewModel }) {
  const contextLine = focusContextLine(viewModel);
  return (
    <div className="space-y-2">
      {contextLine ? <p className="text-muted-foreground text-xs">{contextLine}</p> : null}
      <p className="text-foreground text-sm leading-relaxed font-medium">
        {viewModel.recommendation}
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {viewModel.recommendationRationale}
      </p>
      {viewModel.sharedEquivalentNote ? (
        <p className="text-muted-foreground text-xs leading-relaxed italic">
          {viewModel.sharedEquivalentNote}
        </p>
      ) : null}
    </div>
  );
}

function ScenarioComparisonList({
  scenarios,
}: {
  scenarios: ScenarioComparisonViewModel['scenarios'];
}) {
  const ordered = [...scenarios].sort((a, b) => {
    if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1;
    if (a.isBaseline !== b.isBaseline) return a.isBaseline ? 1 : -1;
    return 0;
  });

  return (
    <ul className="space-y-2">
      {ordered.map((scenario) => (
        <li
          key={scenario.scenarioId}
          className={cn(
            'rounded-lg border px-3 py-2.5',
            scenario.isRecommended
              ? 'border-primary/50 bg-primary/8 ring-primary/20 ring-1'
              : 'border-analysis-border/50 bg-analysis-surface-alt/40',
          )}
        >
          <div className="flex items-start gap-2">
            {scenario.isRecommended ? (
              <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" />
            ) : (
              <span className="mt-1.5 size-3.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  scenario.isRecommended ? 'text-primary' : 'text-foreground',
                )}
              >
                {scenario.label}
                {scenario.isRecommended ? (
                  <span className="text-primary/80 ml-1.5 text-[11px] font-medium tracking-wide uppercase">
                    Recommandé
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {scenario.summaryLine}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatTechnicalLine(detail: ScenarioTechnicalDetail): string {
  const parts = [
    detail.endReadiness != null ? `Readiness ${detail.endReadiness}` : null,
    detail.endAdaptation != null ? `Adaptation ${detail.endAdaptation}` : null,
    `Env. ${detail.environmentalImpact}`,
    detail.endConfidenceLabel ? `Conf. ${detail.endConfidenceLabel}` : null,
    detail.limitingFactor,
    detail.endVerdict,
  ].filter(Boolean);
  return parts.join(' · ');
}

function ScenarioTechnicalDetails({
  scenarios,
}: {
  scenarios: ScenarioComparisonViewModel['scenarios'];
}) {
  if (scenarios.length === 0) return null;

  return (
    <details className="border-border/50 group rounded-lg border">
      <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-primary/30 cursor-pointer list-none px-3 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-hidden">
        <span className="group-open:hidden">Voir le détail technique</span>
        <span className="hidden group-open:inline">Masquer le détail technique</span>
      </summary>
      <ul className="border-border/50 space-y-2 border-t px-3 py-2.5">
        {scenarios.map((scenario) => (
          <li
            key={scenario.scenarioId}
            className="text-muted-foreground text-[11px] leading-relaxed"
          >
            <span className="text-foreground font-medium">{scenario.label}</span>
            <span className="mx-1.5">—</span>
            <span>{formatTechnicalLine(scenario.technicalDetail)}</span>
            {scenario.technicalDetail.tradeOffs.length > 0 ? (
              <span className="mt-0.5 block opacity-80">
                {scenario.technicalDetail.tradeOffs.join(' · ')}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
