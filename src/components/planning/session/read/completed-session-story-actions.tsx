'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss/discuss-with-coach-button';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';

export function CompletedSessionStoryActions({
  sessionId,
  analysis,
  isAnalyzing,
  onReanalyze,
}: {
  sessionId: string;
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
  onReanalyze?: () => void;
}) {
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  if (!onReanalyze) {
    return <DiscussWithCoachButton size="sm" target={{ kind: 'planned-session', sessionId }} />;
  }

  // While analyzing, the header ComplianceBadge is the only progress cue.
  const showReanalyze = !isAnalyzing;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5">
      <DiscussWithCoachButton size="sm" target={{ kind: 'planned-session', sessionId }} />
      {showReanalyze ? (
        <Button
          disabled={guardDisabled}
          size="sm"
          type="button"
          variant={analysis ? 'ghost' : 'outline'}
          onClick={onReanalyze}
        >
          <RefreshCw className="size-3.5" />
          {guardedActionLabel(
            offline,
            offlineLabel,
            analysis ? 'Recalculer la conformité' : 'Analyser la conformité',
          )}
        </Button>
      ) : null}
    </div>
  );
}
