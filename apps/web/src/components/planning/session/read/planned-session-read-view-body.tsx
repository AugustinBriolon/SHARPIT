'use client';

import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';
import type { MorningProposalCompareInput } from '@sharpit/server/lib/today/rich/morning-proposal-compare';
import {
  PlannedSessionRealizedView,
  PlannedSessionUpcomingView,
} from '@/components/planning/session/read/planned-session-read-view-sections';
import { PrescribedPlanCollapsible } from '@/components/planning/session/read/planned-session-prescribed-plan';
import type { usePlannedSessionReadPanels } from '@/components/planning/session/read/use-planned-session-read-panels';

export function PlannedSessionReadViewBody({
  session,
  morningProposal,
  panels,
}: {
  session: ClientPlannedSession;
  morningProposal?: MorningProposalCompareInput;
  panels: ReturnType<typeof usePlannedSessionReadPanels>;
}) {
  if (panels.readData.isRealized) {
    return (
      <PlannedSessionRealizedView
        analysisState={panels.analysisState}
        dateLabel={panels.readData.dateLabel}
        headerActions={panels.headerActions}
        intentLine={panels.readData.intentLine}
        morningProposal={morningProposal}
        session={session}
        prescribedPlan={
          <PrescribedPlanCollapsible
            deroulePanel={panels.deroulePanel}
            secondaryDetails={panels.secondaryDetails}
            session={session}
          />
        }
      />
    );
  }

  return (
    <PlannedSessionUpcomingView
      dateLabel={panels.readData.dateLabel}
      deroulePanel={panels.deroulePanel}
      goalTitle={panels.readData.goal?.title}
      headerActions={panels.headerActions}
      intentLine={panels.readData.intentLine}
      morningProposal={morningProposal}
      secondaryDetails={panels.secondaryDetails}
      session={session}
    />
  );
}
