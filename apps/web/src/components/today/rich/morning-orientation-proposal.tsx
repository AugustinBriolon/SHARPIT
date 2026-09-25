'use client';

import { MorningOrientationProposalActions } from '@/components/today/rich/morning-orientation-proposal-actions';
import {
  buildProposalDisplay,
  MorningOrientationProposalButton,
  proposalStatusMessage,
} from '@/components/today/rich/morning-orientation-proposal-parts';
import type { DisplayMode } from '@/lib/preferences/display-mode';

type Proposal = {
  why?: string | null;
  sessionId: string;
  current: { durationMin: number | null; load: number | null; intensityLabel?: string | null };
  proposed: { durationMin: number | null; load: number | null; intensityLabel?: string | null };
};

export function MorningOrientationProposal({
  busy,
  direction: _direction,
  mode,
  offline,
  offlineLabel,
  onAccept,
  onOpenDetails,
  onPrefetch,
  onReject,
  pending,
  proposal,
}: {
  busy: boolean;
  direction: 'DOWN' | 'UP';
  mode: DisplayMode;
  offline: boolean;
  offlineLabel: string;
  onAccept: () => void;
  onOpenDetails: () => void;
  onPrefetch: () => void;
  onReject: () => void;
  pending: 'refresh' | 'hold' | 'apply' | null;
  proposal: Proposal;
}) {
  const display = buildProposalDisplay(proposal, mode);
  const statusMessage = proposalStatusMessage(pending);

  return (
    <section
      aria-busy={busy || undefined}
      aria-label="Proposition du matin"
      className="space-y-2.5"
    >
      {statusMessage ? (
        <p aria-live="polite" className="sr-only" role="status">
          {statusMessage}
        </p>
      ) : null}
      <MorningOrientationProposalButton
        detailSessionId={display.detailSessionId}
        fromLabel={display.fromLabel}
        meta={display.meta}
        proposal={proposal}
        toLabel={display.toLabel}
        onOpenDetails={onOpenDetails}
        onPrefetch={onPrefetch}
      />

      <MorningOrientationProposalActions
        busy={busy}
        offline={offline}
        offlineLabel={offlineLabel}
        pending={pending}
        onAccept={onAccept}
        onReject={onReject}
      />
    </section>
  );
}
