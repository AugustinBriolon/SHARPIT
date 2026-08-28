'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';
import { ActivityHeaderMetricRow } from '@/components/training/activity/detail/activity-header-metric-row';
import { useActivityFeelingEditor } from '@/components/training/activity/detail/use-activity-feeling-editor';
import { useAppModal } from '@/providers/app-modal-provider';
import {
  plannedSessionChipLabel,
  plannedSessionChipValue,
} from '@/lib/activity/planned-session/activity-planned-session-display';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { PlannedSessionSummary } from '@/components/training/activity/detail/types';

function ActivityHeaderFeelingRow({
  activityId,
  feeling,
  rpe,
}: {
  activityId: string;
  feeling: string;
  rpe: number | null;
}) {
  const editor = useActivityFeelingEditor({ activityId, feeling, rpe });

  return (
    <>
      <ActivityHeaderMetricRow label="Ressenti" value={feeling} onClick={editor.openDialog} />
      <ActivityFeelingDialog
        activityId={activityId}
        feeling={editor.editFeeling}
        feelingError={editor.feelingError}
        isPending={editor.isPending}
        open={editor.open}
        rpe={editor.editRpe}
        onOpenChange={editor.setOpen}
        onRpeChange={editor.setEditRpe}
        onSave={() => void editor.handleSave()}
        onFeelingChange={(next) => {
          editor.setEditFeeling(next);
          editor.setFeelingError(null);
        }}
      />
    </>
  );
}

function ActivityHeaderFeelingPromptRow({ activityId }: { activityId: string }) {
  const editor = useActivityFeelingEditor({ activityId, feeling: '', rpe: null });

  return (
    <>
      <ActivityHeaderMetricRow label="Ressenti" value="Ajouter" onClick={editor.openDialog} />
      <ActivityFeelingDialog
        activityId={activityId}
        feeling={editor.editFeeling}
        feelingError={editor.feelingError}
        isPending={editor.isPending}
        open={editor.open}
        rpe={editor.editRpe}
        onOpenChange={editor.setOpen}
        onRpeChange={editor.setEditRpe}
        onSave={() => void editor.handleSave()}
        onFeelingChange={(next) => {
          editor.setEditFeeling(next);
          editor.setFeelingError(null);
        }}
      />
    </>
  );
}

function ActivityHeaderConformityRow({
  activityId,
  planned,
  isAnalyzing,
}: {
  activityId: string;
  planned: PlannedSessionSummary;
  isAnalyzing: boolean;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();

  function open() {
    openPlannedSession({
      sessionId: planned.id,
      omitLinkedActivityNavigation: true,
      seed: {
        title: planned.title,
        description: planned.description,
        type: planned.type,
        date: planned.date,
        durationMin: planned.durationMin,
        intensity: planned.intensity,
        analysis: planned.analysis,
        analyzedAt: planned.analyzedAt,
        activityId,
      },
    });
  }

  return (
    <ActivityHeaderMetricRow
      label={plannedSessionChipLabel(planned, isAnalyzing)}
      value={plannedSessionChipValue(planned, isAnalyzing)}
      onClick={open}
      onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, planned.id)}
    />
  );
}

function resolveEvaluationRows({
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
  const visible = hasFeeling || showFeelingPrompt || showConformity;
  return { hasFeeling, showFeelingPrompt, showConformity, visible };
}

export function ActivityHeaderEvaluations({
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
  const rows = resolveEvaluationRows({ feeling, rpe, plannedSession });

  if (!rows.visible) {
    return null;
  }

  return (
    <div className="border-border/50 space-y-0.5 border-t pt-2">
      {rows.hasFeeling ? (
        <ActivityHeaderFeelingRow activityId={activityId} feeling={feeling!} rpe={rpe} />
      ) : null}
      {rows.showFeelingPrompt ? <ActivityHeaderFeelingPromptRow activityId={activityId} /> : null}
      {rows.showConformity && plannedSession ? (
        <ActivityHeaderConformityRow
          activityId={activityId}
          isAnalyzing={!plannedAnalysisReady}
          planned={plannedSession}
        />
      ) : null}
    </div>
  );
}
