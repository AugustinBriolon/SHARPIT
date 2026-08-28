'use client';

import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { useAppModal } from '@/providers/app-modal-provider';
import { activityTypeLabels } from '@/lib/format';
import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { PlannedSessionSummary } from './types';

function plannedChipValue(
  analysis: ReturnType<typeof parseSessionAnalysis>,
  isAnalyzing: boolean,
  planned: PlannedSessionSummary,
): string {
  if (analysis) {
    return `${analysis.complianceScore}/100`;
  }
  if (isAnalyzing) {
    return 'Analyse…';
  }
  return planned.title ?? activityTypeLabels[planned.type];
}

function plannedChipLabel(
  analysis: ReturnType<typeof parseSessionAnalysis>,
  isAnalyzing: boolean,
): string {
  if (analysis || isAnalyzing) {
    return 'Conformité';
  }
  return 'Liée au plan';
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
  const analysis = parseSessionAnalysis(planned.analysis);
  const value = plannedChipValue(analysis, isAnalyzing, planned);

  function prefetch() {
    prefetchPlannedSessionDetail(queryClient, planned.id);
  }

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
        activityId: activityId ?? null,
      },
    });
  }

  return (
    <ActivityMetaChip
      icon={CalendarCheck}
      label={plannedChipLabel(analysis, isAnalyzing)}
      value={value}
      onClick={open}
      onPointerEnter={prefetch}
    />
  );
}
