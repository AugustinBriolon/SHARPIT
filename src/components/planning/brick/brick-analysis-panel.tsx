'use client';

import { ArrowLeftRight, Layers, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { activityTypeLabels } from '@/lib/format';
import { sessionScoreColor } from '@/lib/planned-session/display/session-analysis-display';
import { cn } from '@/lib/utils';
import { useAnalyzeBrick, useBrickAnalysis, usePlannedSessions } from '@/hooks/use-data';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import type { BrickAnalysis } from '@/lib/validators/coach';
import type { ClientPlannedSession } from '@/lib/query/types';

function renderAnalyzeButtonContent(isAnalyzing: boolean, offline: boolean, offlineLabel: string) {
  if (isAnalyzing) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" /> Analyse de l&apos;enchaînement…
      </>
    );
  }
  if (offline) {
    return offlineLabel;
  }
  return (
    <>
      <Sparkles className="size-4" /> Analyser l&apos;enchaînement
    </>
  );
}

type AnalysisContentProps = {
  allLinked: boolean;
  analysis: BrickAnalysis | null;
  linkedCount: number;
  legs: ClientPlannedSession[];
  isAnalyzing: boolean;
  onAnalyze: () => void;
  offline: boolean;
  guardDisabled: boolean;
  offlineLabel: string;
};

function BrickAnalysisScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('font-mono text-2xl font-semibold', sessionScoreColor(score))}>
        {score}
      </span>
      <span className="text-muted-foreground text-xs">/100</span>
    </div>
  );
}

function BrickAnalysisTransition({ transition }: { transition: string }) {
  return (
    <div className="border-primary/20 bg-background/60 rounded-md border p-2.5">
      <p className="text-primary flex items-center gap-1.5 text-xs font-medium">
        <ArrowLeftRight className="size-3.5" />
        Transition
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{transition}</p>
    </div>
  );
}

function BrickAnalysisRemarks({ remarks }: { remarks: string[] }) {
  if (remarks.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-1">
      {remarks.map((remark, index) => (
        <li key={index} className="text-muted-foreground flex gap-1.5 text-xs">
          <span className="text-primary">•</span>
          <span>{remark}</span>
        </li>
      ))}
    </ul>
  );
}

function BrickAnalysisReanalyzeButton({
  isAnalyzing,
  onAnalyze,
  offline,
  guardDisabled,
  offlineLabel,
}: {
  isAnalyzing: boolean;
  onAnalyze: () => void;
  offline: boolean;
  guardDisabled: boolean;
  offlineLabel: string;
}) {
  return (
    <button
      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
      disabled={isAnalyzing || guardDisabled}
      type="button"
      onClick={onAnalyze}
    >
      {isAnalyzing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
      {offline ? offlineLabel : "Ré-analyser l'enchaînement"}
    </button>
  );
}

function BrickAnalysisDetails({
  analysis,
  isAnalyzing,
  onAnalyze,
  offline,
  guardDisabled,
  offlineLabel,
}: {
  analysis: BrickAnalysis;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  offline: boolean;
  guardDisabled: boolean;
  offlineLabel: string;
}) {
  return (
    <div className="space-y-2">
      <BrickAnalysisScore score={analysis.overallScore} />
      <p className="text-muted-foreground text-sm">{analysis.summary}</p>
      <BrickAnalysisTransition transition={analysis.transition} />
      <BrickAnalysisRemarks remarks={analysis.remarks} />
      {analysis.recommendation ? (
        <p className="border-primary/20 bg-primary/5 rounded-md border p-2 text-xs">
          💡 {analysis.recommendation}
        </p>
      ) : null}
      <BrickAnalysisReanalyzeButton
        guardDisabled={guardDisabled}
        isAnalyzing={isAnalyzing}
        offline={offline}
        offlineLabel={offlineLabel}
        onAnalyze={onAnalyze}
      />
    </div>
  );
}

function renderAnalysisContent(props: AnalysisContentProps) {
  const {
    allLinked,
    analysis,
    linkedCount,
    legs,
    isAnalyzing,
    onAnalyze,
    offline,
    guardDisabled,
    offlineLabel,
  } = props;

  if (!allLinked) {
    return (
      <p className="text-muted-foreground text-xs">
        Lie chaque sport du brick à son activité réalisée pour analyser l&apos;enchaînement (
        {linkedCount}/{legs.length} lié
        {linkedCount > 1 ? 's' : ''}).
      </p>
    );
  }

  if (analysis) {
    return (
      <BrickAnalysisDetails
        analysis={analysis}
        guardDisabled={guardDisabled}
        isAnalyzing={isAnalyzing}
        offline={offline}
        offlineLabel={offlineLabel}
        onAnalyze={onAnalyze}
      />
    );
  }

  return (
    <Button
      disabled={guardDisabled || isAnalyzing}
      size="sm"
      type="button"
      variant="outline"
      onClick={onAnalyze}
    >
      {renderAnalyzeButtonContent(isAnalyzing, offline, offlineLabel)}
    </Button>
  );
}

function BrickAnalysisPanelHeader({ legs }: { legs: ClientPlannedSession[] }) {
  return (
    <div className="text-primary flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
      <Layers className="size-3.5 shrink-0" />
      Analyse de l&apos;enchaînement
      <span className="text-muted-foreground ml-auto font-normal normal-case">
        {legs.map((l) => activityTypeLabels[l.type]).join(' → ')}
      </span>
    </div>
  );
}

function useBrickAnalysisPanel(brickGroupId: string) {
  const plannedQuery = usePlannedSessions();
  const analysisQuery = useBrickAnalysis(brickGroupId);
  const analyzeBrick = useAnalyzeBrick();
  const [error, setError] = useState<string | null>(null);
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  const legs = useMemo(
    () =>
      (plannedQuery.data ?? [])
        .filter((s) => s.brickGroupId === brickGroupId)
        .sort((a, b) => (a.brickOrder ?? 0) - (b.brickOrder ?? 0)),
    [plannedQuery.data, brickGroupId],
  );

  const linkedCount = legs.filter((l) => l.activityId).length;
  const allLinked = legs.length >= 2 && linkedCount === legs.length;
  const analysis = analyzeBrick.data?.content ?? analysisQuery.data?.content ?? null;
  const isAnalyzing = analyzeBrick.isPending;

  function handleAnalyze() {
    if (guardDisabled) {
      return;
    }
    setError(null);
    // BACKGROUND: isAnalyzing drives the panel — fire-and-forget.
    analyzeBrick.mutate(brickGroupId, {
      onSuccess: () => toast.success("Analyse de l'enchaînement terminée"),
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Échec de l'analyse.");
        toast.error("L'analyse de l'enchaînement a échoué.");
      },
    });
  }

  return {
    allLinked,
    analysis,
    error,
    guardDisabled,
    handleAnalyze,
    isAnalyzing,
    legs,
    linkedCount,
    offline,
    offlineLabel,
  };
}

export function BrickAnalysisPanel({ brickGroupId }: { brickGroupId: string }) {
  const panel = useBrickAnalysisPanel(brickGroupId);

  return (
    <div className="border-primary/30 bg-primary/5 space-y-3 rounded-lg border p-3">
      <BrickAnalysisPanelHeader legs={panel.legs} />
      {renderAnalysisContent({
        allLinked: panel.allLinked,
        analysis: panel.analysis,
        linkedCount: panel.linkedCount,
        legs: panel.legs,
        isAnalyzing: panel.isAnalyzing,
        onAnalyze: panel.handleAnalyze,
        offline: panel.offline,
        guardDisabled: panel.guardDisabled,
        offlineLabel: panel.offlineLabel,
      })}
      {panel.error && <p className="text-destructive text-xs">{panel.error}</p>}
    </div>
  );
}
