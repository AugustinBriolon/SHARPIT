"use client";

import { ArrowLeftRight, Layers, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { activityTypeLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useAnalyzeBrick,
  useBrickAnalysis,
  usePlannedSessions,
} from "@/hooks/use-data";

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
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
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Layers className="size-3.5 shrink-0" />
        Analyse de l&apos;enchaînement
        <span className="ml-auto font-normal normal-case text-muted-foreground">
          {legs.map((l) => activityTypeLabels[l.type]).join(" → ")}
        </span>
      </div>

      {!allLinked ? (
        <p className="text-xs text-muted-foreground">
          Lie chaque sport du brick à son activité réalisée pour analyser
          l&apos;enchaînement ({linkedCount}/{legs.length} lié
          {linkedCount > 1 ? "s" : ""}).
        </p>
      ) : analysis ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-2xl font-semibold",
                scoreColor(analysis.overallScore),
              )}
            >
              {analysis.overallScore}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>

          <div className="rounded-md border border-primary/20 bg-background/60 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <ArrowLeftRight className="size-3.5" />
              Transition
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {analysis.transition}
            </p>
          </div>

          {analysis.remarks.length > 0 && (
            <ul className="space-y-1">
              {analysis.remarks.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="text-primary">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          {analysis.recommendation && (
            <p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
              💡 {analysis.recommendation}
            </p>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {isAnalyzing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Ré-analyser l&apos;enchaînement
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
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
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
