'use client';

import { MorningEvidencePending } from '@/components/today/rich/morning-orientation-evidence';
import { MorningOrientationProposal } from '@/components/today/rich/morning-orientation-proposal';
import { resolveMorningOrientationProposal } from '@/components/today/rich/morning-orientation-actions-helpers';
import { useMorningOrientationActions } from '@/components/today/rich/use-morning-orientation-actions';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useAppModal } from '@/providers/app-modal-provider';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { useQueryClient } from '@tanstack/react-query';

type MorningOrientation = NonNullable<TodayViewModel['morningOrientation']>;

export function MorningOrientationReadyActions({
  trainingDayId,
  orientation,
  onRefreshed,
}: {
  trainingDayId: string;
  orientation: MorningOrientation;
  onRefreshed?: () => void;
}) {
  const queryClient = useQueryClient();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const { openPlannedSession } = useAppModal();
  const { mode } = useDisplayMode();
  const { actRecalibration, pending, refreshEvidence } = useMorningOrientationActions({
    guardDisabled,
    onRefreshed,
    trainingDayId,
  });

  if (orientation.phase === 'EVIDENCE_PENDING' && orientation.showRefreshEvidence) {
    return (
      <MorningEvidencePending
        evidenceLine={orientation.evidenceLine}
        offline={offline}
        offlineLabel={offlineLabel}
        pending={pending === 'refresh'}
        onRefresh={() => void refreshEvidence()}
      />
    );
  }

  if (orientation.phase !== 'ORIENTATION_READY' || !orientation.showFirmActions) {
    return null;
  }

  const resolved = resolveMorningOrientationProposal(orientation);
  if (!resolved) {
    return null;
  }

  const { proposal, decisionId, direction, detailSessionId } = resolved;

  return (
    <MorningOrientationProposal
      busy={pending !== null}
      direction={direction}
      mode={mode}
      offline={offline}
      offlineLabel={offlineLabel}
      pending={pending}
      proposal={proposal}
      onAccept={() => void actRecalibration('accept', decisionId, direction)}
      onReject={() => void actRecalibration('reject', decisionId, null)}
      onOpenDetails={() => {
        if (!detailSessionId) {
          return;
        }
        openPlannedSession({
          morningProposal: {
            why: proposal.why,
            changeSummary: proposal.changeSummary,
            current: proposal.current,
            proposed: proposal.proposed,
          },
          sessionId: detailSessionId,
        });
      }}
      onPrefetch={() => {
        if (detailSessionId) {
          prefetchPlannedSessionDetail(queryClient, detailSessionId);
        }
      }}
    />
  );
}
