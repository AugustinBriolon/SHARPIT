'use client';

import type { PlannedSessionViewModel } from '@/presentation/planned-session-view-model';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { MorningProposalCompareInput } from '@/lib/today/rich/morning-proposal-compare';
import { SensitiveZoneWarning } from '@/components/planning/session/read/planned-session-read-sensitive-zone';
import { usePlannedSessionReadPanels } from '@/components/planning/session/read/use-planned-session-read-panels';
import { PlannedSessionReadViewBody } from '@/components/planning/session/read/planned-session-read-view-body';

export { SensitiveZoneWarning };

/**
 * BEFORE_SESSION prepares; SESSION_COMPLETED reads — two compositions, not one template.
 */
export function PlannedSessionReadView({
  session,
  goals,
  context,
  contextPending = false,
  onEdit,
  morningProposal,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending?: boolean;
  onEdit: () => void;
  /** @deprecated Linked activity actions live in the header menu. */
  omitLinkedActivityNavigation?: boolean;
  morningProposal?: MorningProposalCompareInput;
}) {
  const panels = usePlannedSessionReadPanels({
    session,
    goals,
    context,
    contextPending,
    onEdit,
    morningProposal,
  });

  return (
    <PlannedSessionReadViewBody
      morningProposal={morningProposal}
      panels={panels}
      session={session}
    />
  );
}
