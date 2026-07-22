'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';
import { useApplyScenarioComparison } from '@/hooks/use-apply-scenario-comparison';
import { cn } from '@/lib/utils';
import { GitCompare, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

function defaultSelectedScenarioId(viewModel: ScenarioComparisonViewModel): string | null {
  return (
    viewModel.recommendedScenarioId ??
    viewModel.scenarios.find((s) => s.isRecommended)?.scenarioId ??
    viewModel.scenarios.find((s) => s.canApply)?.scenarioId ??
    viewModel.scenarios[0]?.scenarioId ??
    null
  );
}

export function ScenarioComparisonDialog({
  open,
  onClose,
  viewModel,
  isLoading,
  anchorTrainingDayId,
}: {
  open: boolean;
  onClose: () => void;
  viewModel: ScenarioComparisonViewModel | undefined;
  isLoading: boolean;
  anchorTrainingDayId?: string;
}) {
  const applyMutation = useApplyScenarioComparison();

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

        <ScenarioComparisonBody
          anchorTrainingDayId={anchorTrainingDayId}
          applyMutation={applyMutation}
          isLoading={isLoading}
          open={open}
          viewModel={viewModel}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function ScenarioComparisonBody({
  isLoading,
  viewModel,
  onClose,
  anchorTrainingDayId,
  applyMutation,
  open,
}: {
  isLoading: boolean;
  viewModel: ScenarioComparisonViewModel | undefined;
  onClose: () => void;
  anchorTrainingDayId?: string;
  applyMutation: ReturnType<typeof useApplyScenarioComparison>;
  open: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !viewModel?.visible) return;
    setSelectedId(defaultSelectedScenarioId(viewModel));
  }, [open, viewModel]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!viewModel?.visible) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune alternative strictement meilleure que le plan actuel sur cet horizon.
      </p>
    );
  }

  // Nested callbacks don't inherit control-flow narrowing — capture after the guard.
  const comparison = viewModel;

  const selected =
    comparison.scenarios.find((s) => s.scenarioId === selectedId) ??
    comparison.scenarios.find((s) => s.isRecommended) ??
    null;

  function applySelected() {
    if (!selected) return;

    if (!selected.canApply) {
      onClose();
      toast.success('Plan conservé');
      return;
    }

    applyMutation.mutate({
      scenarioId: selected.scenarioId,
      kind: selected.kind,
      targetSessionId: selected.targetSessionId,
      horizonDays: comparison.horizonDays,
      anchorTrainingDayId,
      label: selected.label,
    });
    onClose();
  }

  return (
    <div className="space-y-4">
      <ScenarioComparisonHeader viewModel={comparison} />
      <ScenarioComparisonList
        scenarios={comparison.scenarios}
        selectedId={selected?.scenarioId ?? null}
        onSelect={setSelectedId}
      />
      <DialogFooter>
        <Button
          disabled={!selected || applyMutation.isPending}
          type="button"
          onClick={applySelected}
        >
          Appliquer
        </Button>
      </DialogFooter>
    </div>
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
  selectedId,
  onSelect,
}: {
  scenarios: ScenarioComparisonViewModel['scenarios'];
  selectedId: string | null;
  onSelect: (scenarioId: string) => void;
}) {
  const ordered = [...scenarios].sort((a, b) => {
    if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1;
    if (a.isBaseline !== b.isBaseline) return a.isBaseline ? 1 : -1;
    return 0;
  });

  return (
    <ul aria-label="Scénarios" className="space-y-2" role="radiogroup">
      {ordered.map((scenario) => {
        const selected = scenario.scenarioId === selectedId;
        return (
          <li key={scenario.scenarioId}>
            <button
              aria-checked={selected}
              role="radio"
              type="button"
              className={cn(
                'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                selected
                  ? 'border-primary/50 bg-primary/8 ring-primary/20 ring-1'
                  : 'border-analysis-border/50 bg-analysis-surface-alt/40 hover:border-analysis-border',
              )}
              onClick={() => onSelect(scenario.scenarioId)}
            >
              <div className="flex items-start gap-2">
                {scenario.isRecommended ? (
                  <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <span className="mt-1.5 size-3.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      selected ? 'text-primary' : 'text-foreground',
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
