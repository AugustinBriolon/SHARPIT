'use client';

import { CalendarCheck } from 'lucide-react';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { useAppModal } from '@/providers/app-modal-provider';
import { activityTypeLabels } from '@/lib/format';
import { parseSessionAnalysis } from '@/lib/planned-session/session-analysis-display';
import type { PlannedSessionSummary } from './types';

/**
 * Opens the planned-session modal in place (no /planning redirect).
 * Hides the "linked activity" navigation — caller is already on that activity.
 */
export function ActivityPlannedSessionChip({ planned }: { planned: PlannedSessionSummary }) {
  const { openPlannedSession } = useAppModal();
  const analysis = parseSessionAnalysis(planned.analysis);
  const value = analysis
    ? `${analysis.complianceScore}/100`
    : (planned.title ?? activityTypeLabels[planned.type]);

  return (
    <ActivityMetaChip
      icon={CalendarCheck}
      label={analysis ? 'Conformité' : 'Liée au plan'}
      value={value}
      onClick={() =>
        openPlannedSession({ sessionId: planned.id, omitLinkedActivityNavigation: true })
      }
    />
  );
}
