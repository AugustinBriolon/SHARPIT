'use client';

import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { usePhysicalNoteMutations } from '@/hooks/use-physical';
import {
  impactToFunctionalImpact,
  type ImpactChoice,
} from '@/lib/physical-health/reassessment-input';
import type { PhysicalReassessment } from '@/components/planning/session/realize/physical-reassessment-card';

export function useReassessmentSave(
  item: PhysicalReassessment,
  form: {
    state: { severity: number; impact: ImpactChoice | null; comment: string };
  },
  onResolved?: (
    result: { kind: 'saved'; noteTitle: string; severity: number } | { kind: 'dismissed' },
  ) => void,
) {
  const { addCheckin } = usePhysicalNoteMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const canSave = Boolean(form.state.impact) && !guardDisabled && !addCheckin.isPending;

  function handleSave() {
    if (guardDisabled || !form.state.impact) {
      return;
    }
    addCheckin.mutate(
      {
        id: item.noteId,
        data: {
          severity: form.state.severity,
          comment: form.state.comment.trim() || null,
          functionalImpact: impactToFunctionalImpact(form.state.impact),
        },
      },
      {
        onSuccess: () => {
          onResolved?.({
            kind: 'saved',
            noteTitle: item.noteTitle,
            severity: form.state.severity,
          });
        },
      },
    );
  }

  return {
    canSave,
    handleSave,
    offline,
    offlineLabel,
    pending: addCheckin.isPending,
  };
}
