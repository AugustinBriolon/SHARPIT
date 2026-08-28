'use client';

import { ActivityFeelingChip } from '@/components/training/activity/detail/activity-feeling-chip';
import { ActivityFeelingPrompt } from '@/components/training/activity/detail/activity-feeling-prompt';
import { ActivityPlannedSessionChip } from '@/components/training/activity/detail/activity-planned-session-chip';
import type { PlannedSessionSummary } from '@/components/training/activity/detail/types';

function resolveHeaderChipVisibility({
  feeling,
  rpe,
  plannedSession,
}: {
  feeling: string | null;
  rpe: number | null;
  plannedSession: PlannedSessionSummary | null;
}) {
  const hasFeeling = Boolean(feeling?.trim());
  const showFeelingPrompt = rpe === null && !hasFeeling;
  const showConformity = Boolean(plannedSession);
  return {
    hasFeeling,
    showFeelingPrompt,
    showConformity,
    visible: hasFeeling || showFeelingPrompt || showConformity,
  };
}

export function ActivityHeaderContextChips({
  activityId,
  feeling,
  rpe,
  plannedSession,
  plannedAnalysisReady,
}: {
  activityId: string;
  feeling: string | null;
  rpe: number | null;
  plannedSession: PlannedSessionSummary | null;
  plannedAnalysisReady: boolean;
}) {
  const chips = resolveHeaderChipVisibility({ feeling, rpe, plannedSession });

  if (!chips.visible) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.hasFeeling ? (
        <ActivityFeelingChip activityId={activityId} feeling={feeling!} rpe={rpe} />
      ) : null}
      {chips.showFeelingPrompt ? <ActivityFeelingPrompt activityId={activityId} /> : null}
      {chips.showConformity && plannedSession ? (
        <ActivityPlannedSessionChip
          activityId={activityId}
          isAnalyzing={!plannedAnalysisReady}
          planned={plannedSession}
        />
      ) : null}
    </div>
  );
}
