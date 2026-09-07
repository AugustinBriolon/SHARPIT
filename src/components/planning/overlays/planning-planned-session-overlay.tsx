'use client';

import dynamic from 'next/dynamic';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';

const PlannedSessionDialog = dynamic(
  () =>
    import('@/components/planning/session/edit/planned-session-dialog').then(
      (mod) => mod.PlannedSessionDialog,
    ),
  { ssr: false },
);

export function PlanningPlannedSessionOverlay({
  createDefaultDate,
  editSession,
  goals,
  isCreateDialog,
  isLoading,
  showPlannedDialog,
  onClose,
}: {
  createDefaultDate: Date;
  editSession: ClientPlannedSession | null;
  goals: ClientGoal[];
  isCreateDialog: boolean;
  isLoading: boolean;
  showPlannedDialog: boolean;
  onClose: () => void;
}) {
  if (!showPlannedDialog || isLoading) {
    return null;
  }

  return (
    <PlannedSessionDialog
      defaultDate={isCreateDialog ? createDefaultDate : undefined}
      goals={goals}
      session={editSession ?? undefined}
      onClose={onClose}
    />
  );
}
