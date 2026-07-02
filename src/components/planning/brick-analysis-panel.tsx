'use client';

import { ArrowLeftRight, Layers, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { activityTypeLabels } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAnalyzeBrick, useBrickAnalysis, usePlannedSessions } from '@/hooks/use-data';
import type { BrickAnalysis } from '@/lib/validators/coach';
import type { ClientPlannedSession } from '@/lib/client/types';

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function renderAnalysisContent(
  allLinked: boolean,
  analysis: BrickAnalysis | null,
  linkedCount: number,
  legs: ClientPlannedSession[],
  isAnalyzing: boolean,
  onAnalyze: () => void,
) {
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn('font-mono text-2xl font-semibold', scoreColor(analysis.overallScore))}
          >
            {analysis.overallScore}
          </span>
          <span className="text-muted-foreground text-xs">/100</span>
        </div>
        <p className="text-muted-foreground text-sm">{analysis.summary}</p>

        <div className="border-primary/20 bg-background/60 rounded-md border p-2.5">
          <p className="text-primary flex items-center gap-1.5 text-xs font-medium">
            <ArrowLeftRight className="size-3.5" />
            Transition
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{analysis.transition}</p>
        </div>

        {analysis.remarks.length > 0 && (
          <ul className="space-y-1">
            {analysis.remarks.map((r, i) => (
              <li key={i} className="text-muted-foreground flex gap-1.5 text-xs">
                <span className="text-primary">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}

        {analysis.recommendation && (
          <p className="border-primary/20 bg-primary/5 rounded-md border p-2 text-xs">
            💡 {analysis.recommendation}
          </p>
        )}

        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          disabled={isAnalyzing}
          type="button"
          onClick={onAnalyze}
        >
          {isAnalyzing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Ré-analyser l&apos;enchaînement
        </button>
      </div>
    );
  }

  return (
    <Button disabled={isAnalyzing} size="sm" type="button" variant="outline" onClick={onAnalyze}>
      {isAnalyzing ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Analyse de l&apos;enchaînement…
        </>
      ) : (
        <>
          <Sparkles className="size-4" /> Analyser l&apos;enchaînement
        </>
      )}
    </Button>
  );
}

export function BrickAnalysisPanel({ brickGroupId }: { brickGroupId: string }) {
  const plannedQuery = usePlannedSessions();
  const analysisQuery = useBrickAnalysis(brickGroupId);
  const analyzeBrick = useAnalyzeBrick();
  const [error, setError] = useState<string | null>(null);

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

  async function handleAnalyze() {
    setError(null);
    try {
      await analyzeBrick.mutateAsync(brickGroupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'analyse.");
    }
  }

  return (
    <div className="border-primary/30 bg-primary/5 space-y-3 rounded-lg border p-3">
      <div className="text-primary flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <Layers className="size-3.5 shrink-0" />
        Analyse de l&apos;enchaînement
        <span className="text-muted-foreground ml-auto font-normal normal-case">
          {legs.map((l) => activityTypeLabels[l.type]).join(' → ')}
        </span>
      </div>

      {renderAnalysisContent(allLinked, analysis, linkedCount, legs, isAnalyzing, handleAnalyze)}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
