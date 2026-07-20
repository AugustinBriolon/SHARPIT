'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { ActivityMetaChip } from '@/components/training/activity-detail/activity-meta-chip';
import { useGoals, usePlannedSessions } from '@/hooks/use-data';
import { activityTypeLabels } from '@/lib/format';
import { parseSessionAnalysis } from '@/lib/session-analysis-display';
import type { PlannedSessionSummary } from './types';

/**
 * Opens the planned-session modal in place (no /planning redirect).
 * Hides the "linked activity" navigation — caller is already on that activity.
 */
export function ActivityPlannedSessionChip({ planned }: { planned: PlannedSessionSummary }) {
  const [open, setOpen] = useState(false);
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();

  const session = plannedQuery.data?.find((item) => item.id === planned.id) ?? null;

  useEffect(() => {
    if (!open) return;
    if (plannedQuery.isLoading || plannedQuery.isFetching) return;
    if (!session) setOpen(false);
  }, [open, plannedQuery.isFetching, plannedQuery.isLoading, session]);

  const analysis = parseSessionAnalysis(planned.analysis);
  const value = analysis
    ? `${analysis.complianceScore}/100`
    : (planned.title ?? activityTypeLabels[planned.type]);

  return (
    <>
      <ActivityMetaChip
        icon={CalendarCheck}
        label="Planifiée"
        value={value}
        onClick={() => {
          setOpen(true);
          void plannedQuery.refetch();
        }}
      />
      {open && session ? (
        <PlannedSessionDialog
          goals={goalsQuery.data ?? []}
          session={session}
          omitLinkedActivityNavigation
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
