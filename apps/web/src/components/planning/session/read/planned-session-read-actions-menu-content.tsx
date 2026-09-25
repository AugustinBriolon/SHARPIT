'use client';

import {
  CoachDiscussMenuItem,
  EditSessionMenuItem,
  LinkedActivityMenuItems,
  ReanalyzeMenuItem,
} from '@/components/planning/session/read/planned-session-read-actions-menu-items';
import type { PlannedSessionHeaderActions } from '@/components/planning/session/read/planned-session-read-actions-menu';
import { guardedActionLabel } from '@/hooks/use-offline-guard';

export function PlannedSessionReadActionsMenuContent({
  actions,
  offline,
  offlineLabel,
  onNavigate,
}: {
  actions: PlannedSessionHeaderActions;
  offline: boolean;
  offlineLabel: string;
  onNavigate: () => void;
}) {
  const showReanalyze = Boolean(actions.onReanalyze) && !actions.isAnalyzing;

  return (
    <>
      <EditSessionMenuItem onEdit={actions.onEdit} />
      {showReanalyze ? (
        <ReanalyzeMenuItem
          disabled={actions.reanalyzeDisabled ?? false}
          label={guardedActionLabel(
            offline,
            offlineLabel,
            actions.hasAnalysis ? 'Recalculer' : 'Analyser',
          )}
          onReanalyze={actions.onReanalyze!}
        />
      ) : null}
      <CoachDiscussMenuItem sessionId={actions.sessionId} onNavigate={onNavigate} />
      {actions.activityId ? (
        <LinkedActivityMenuItems
          activityId={actions.activityId}
          delinkPending={actions.delinkPending ?? false}
          onDelink={actions.onDelink}
          onNavigate={onNavigate}
        />
      ) : null}
    </>
  );
}
