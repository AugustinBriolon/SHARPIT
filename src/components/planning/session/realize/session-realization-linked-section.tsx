'use client';

import { CompletedSessionStory } from '../read/completed-session-story';
import { Button } from '@/components/ui/button';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { HeartPulse } from 'lucide-react';
import {
  PhysicalReassessmentQueue,
  type PhysicalReassessment,
} from '@/components/planning/session/realize/physical-reassessment-card';
import type { SessionRealizationAnalysisState } from '@/components/planning/session/realize/use-session-realization-analysis';

function AnalysisTimeoutBanner({
  pollTimedOut,
  hasAnalysis,
  guardDisabled,
  analyzePending,
  onRetry,
}: {
  pollTimedOut: boolean;
  hasAnalysis: boolean;
  guardDisabled: boolean;
  analyzePending: boolean;
  onRetry: () => void;
}) {
  if (!pollTimedOut || hasAnalysis) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="border-analysis-border/60 bg-analysis-surface-alt space-y-2 rounded-md border px-3 py-2.5"
    >
      <p className="text-sm font-medium">Analyse indisponible pour le moment</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        La comparaison plan/réel n&apos;a pas abouti dans le délai prévu. Tu peux relancer
        l&apos;analyse depuis le menu.
      </p>
      <Button
        disabled={guardDisabled || analyzePending}
        size="sm"
        type="button"
        variant="outline"
        onClick={onRetry}
      >
        Relancer
      </Button>
    </div>
  );
}

function mergeLinkedSessionActivity(
  session: ClientPlannedSession,
  linked: ClientActivity | null,
  analysis: SessionRealizationAnalysisState['analysis'],
  analyzedAt: SessionRealizationAnalysisState['analyzedAt'],
) {
  return {
    ...session,
    activity:
      linked && session.activity
        ? {
            ...session.activity,
            feeling: linked.feeling,
            rpe: linked.rpe,
            notes: linked.notes,
          }
        : session.activity,
    analysis: analysis ?? session.analysis,
    analyzedAt: analyzedAt ?? session.analyzedAt,
  };
}

export function LinkedAnalysisSection({
  session,
  linked,
  analysis,
  analyzedAt,
  isAnalyzing,
  pollTimedOut,
  painReassessments,
  guardDisabled,
  analyzePending,
  onReanalyze,
}: {
  session: ClientPlannedSession;
  linked: ClientActivity | null;
  analysis: SessionRealizationAnalysisState['analysis'];
  analyzedAt: SessionRealizationAnalysisState['analyzedAt'];
  isAnalyzing: boolean;
  pollTimedOut: boolean;
  painReassessments: PhysicalReassessment[];
  guardDisabled: boolean;
  analyzePending: boolean;
  onReanalyze: () => void;
}) {
  const hasAnalysis = Boolean(analysis && analyzedAt);

  return (
    <div className="space-y-3">
      <AnalysisTimeoutBanner
        analyzePending={analyzePending}
        guardDisabled={guardDisabled}
        hasAnalysis={hasAnalysis}
        pollTimedOut={pollTimedOut}
        onRetry={onReanalyze}
      />
      <CompletedSessionStory
        isAnalyzing={isAnalyzing && !pollTimedOut}
        session={mergeLinkedSessionActivity(session, linked, analysis, analyzedAt)}
      />
      {painReassessments.length > 0 ? (
        <div className="border-analysis-border/50 border-t pt-3">
          <p className="text-label text-signal-caution mb-2 inline-flex items-center gap-1.5">
            <HeartPulse className="size-3.5 shrink-0" aria-hidden />
            Réévaluer une douleur ou blessure
          </p>
          <PhysicalReassessmentQueue items={painReassessments} />
        </div>
      ) : null}
    </div>
  );
}
