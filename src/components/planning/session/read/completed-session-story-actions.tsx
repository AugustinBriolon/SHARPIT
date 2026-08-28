'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';

function ReanalyzeButtonIcon({ analyzing }: { analyzing: boolean }) {
  if (analyzing) {
    return <Loader2 className="size-3.5 animate-spin" />;
  }
  return <RefreshCw className="size-3.5" />;
}

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

  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5">
      <DiscussWithCoachButton size="sm" target={{ kind: 'planned-session', sessionId }} />
      <Button
        disabled={guardDisabled || isAnalyzing}
        size="sm"
        type="button"
        variant={analysis ? 'ghost' : 'outline'}
        onClick={onReanalyze}
      >
        <ReanalyzeButtonIcon analyzing={isAnalyzing} />
        {guardedActionLabel(
          offline,
          offlineLabel,
          analysis ? 'Recalculer la conformité' : 'Analyser la conformité',
          { active: isAnalyzing, label: 'Analyse…' },
        )}
      </Button>
    </div>
  );
}
