'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { useAppModal } from '@/providers/app-modal-provider';
import {
  plannedSessionChipLabel,
  plannedSessionChipValue,
} from '@/lib/activity/planned-session/activity-planned-session-display';
import { fetchPlannedSessionById } from '@/lib/query/fetchers';
import { patchPlannedSessionAnalysisInCaches } from '@/lib/query/patch-planned-session-analysis-cache';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';
import { cn } from '@/lib/utils';
import type { PlannedSessionSummary } from './types';

const POLL_MS = 3_000;
const POLL_MAX_MS = 120_000;

type PlannedAnalysisPollContext = {
  sessionId: string;
  seed: PlannedSessionSummary;
  queryClient: ReturnType<typeof useQueryClient>;
  setLive: (value: PlannedSessionSummary) => void;
  isCancelled: () => boolean;
};

function applyPlannedAnalysisUpdate(
  updated: Awaited<ReturnType<typeof fetchPlannedSessionById>>,
  ctx: PlannedAnalysisPollContext,
): boolean {
  if (!updated.analyzedAt || !updated.analysis) {
    return false;
  }
  patchPlannedSessionAnalysisInCaches(ctx.queryClient, ctx.sessionId, {
    analysis: updated.analysis,
    analyzedAt: updated.analyzedAt,
  });
  ctx.setLive({
    ...ctx.seed,
    analysis: updated.analysis,
    analyzedAt: updated.analyzedAt,
  });
  return true;
}

async function pollPlannedAnalysis(ctx: PlannedAnalysisPollContext): Promise<void> {
  const startedAt = Date.now();
  while (!ctx.isCancelled() && Date.now() - startedAt < POLL_MAX_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    if (ctx.isCancelled()) {
      return;
    }
    try {
      const updated = await fetchPlannedSessionById(ctx.sessionId);
      if (applyPlannedAnalysisUpdate(updated, ctx)) {
        return;
      }
    } catch {
      // best-effort
    }
  }
}

/**
 * Polls until planned-session analysis lands, then patches React Query caches
 * so Conformité chips update without a full page remount.
 */
function usePlannedAnalysisLive(planned: PlannedSessionSummary, enabled: boolean) {
  const queryClient = useQueryClient();
  const [live, setLive] = useState<PlannedSessionSummary | null>(null);
  const sessionId = planned.id;

  useEffect(() => {
    if (!enabled) {
      setLive(null);
      return;
    }

    let cancelled = false;
    const seed = planned;

    void pollPlannedAnalysis({
      sessionId,
      seed,
      queryClient,
      setLive: (value) => {
        if (!cancelled) {
          setLive(value);
        }
      },
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
    };
    // Seed identity only — avoid re-polling when parent re-renders with a new object.
  }, [enabled, queryClient, sessionId]);

  return live ?? planned;
}

/**
 * Opens the planned-session modal in place (no /planning redirect).
 * Hides the "linked activity" navigation — caller is already on that activity.
 */
export function ActivityPlannedSessionChip({
  planned,
  activityId,
  isAnalyzing = false,
}: {
  planned: PlannedSessionSummary;
  /** Current activity id — marks the seeded session as linked. */
  activityId?: string;
  isAnalyzing?: boolean;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();
  const stillPending = isAnalyzing && !parseSessionAnalysis(planned.analysis);
  const livePlanned = usePlannedAnalysisLive(planned, stillPending);
  const analysisReady = Boolean(parseSessionAnalysis(livePlanned.analysis));
  const showingAnalysis = stillPending && !analysisReady;

  function prefetch() {
    prefetchPlannedSessionDetail(queryClient, planned.id);
  }

  function open() {
    openPlannedSession({
      sessionId: planned.id,
      omitLinkedActivityNavigation: true,
      seed: {
        title: livePlanned.title,
        description: livePlanned.description,
        type: livePlanned.type,
        date: livePlanned.date,
        durationMin: livePlanned.durationMin,
        intensity: livePlanned.intensity,
        analysis: livePlanned.analysis,
        analyzedAt: livePlanned.analyzedAt,
        activityId: activityId ?? null,
      },
    });
  }

  if (showingAnalysis) {
    return (
      <button
        type="button"
        className={cn(
          'pressable inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left',
          'border-primary/30 bg-analysis-surface-alt/60 hover:border-primary/45',
          'lg:min-h-9 lg:py-1.5',
        )}
        onClick={open}
        onPointerEnter={prefetch}
      >
        <Loader2
          className="text-primary size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <span className="min-w-0">
          <span className="text-muted-foreground block text-[10px] leading-none font-medium tracking-wide">
            Conformité
          </span>
          <span
            aria-live="polite"
            className="text-foreground mt-0.5 block text-xs font-semibold"
            role="status"
          >
            Analyse…
          </span>
        </span>
      </button>
    );
  }

  return (
    <ActivityMetaChip
      icon={CalendarCheck}
      label={plannedSessionChipLabel(livePlanned, false)}
      value={plannedSessionChipValue(livePlanned, false)}
      onClick={open}
      onPointerEnter={prefetch}
    />
  );
}
