'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Target } from 'lucide-react';
import { MorningProposalCompare } from '@/components/planning/session/read/morning-proposal-compare';
import { SessionAccessoriesSection } from '../accessories/session-accessories-section';
import { SessionRealization } from '../realize/session-realization';
import type { SessionRealizationAnalysisState } from '../realize/session-realization';
import type { ClientPlannedSession } from '@sharpit/app/lib/query/types';
import type { MorningProposalCompareInput } from '@sharpit/app/lib/today/rich/morning-proposal-compare';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';
import { PlannedSessionReadHeader } from '@/components/planning/session/read/planned-session-read-header';
import type { PlannedSessionHeaderActions } from '@/components/planning/session/read/planned-session-read-actions-menu';
import { SensitiveZoneWarning } from '@/components/planning/session/read/planned-session-read-sensitive-zone';
import { MOI_OBJECTIFS_PATH } from '@sharpit/app/lib/moi/paths';

function GoalLink({ title }: { title: string }) {
  return (
    <Link
      className="text-muted-foreground hover:text-foreground inline-flex min-h-9 items-center gap-1.5 text-sm"
      href={MOI_OBJECTIFS_PATH}
    >
      <Target className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="text-pretty">Sert {title}</span>
    </Link>
  );
}

export function PlannedSessionRealizedView({
  session,
  headerActions,
  dateLabel,
  intentLine,
  analysisState,
  morningProposal,
  prescribedPlan,
}: {
  session: ClientPlannedSession;
  headerActions: PlannedSessionHeaderActions;
  dateLabel: string;
  intentLine?: string | null;
  analysisState: SessionRealizationAnalysisState;
  morningProposal?: MorningProposalCompareInput;
  prescribedPlan: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <PlannedSessionReadHeader
        actions={headerActions}
        dateLabel={dateLabel}
        intentLine={intentLine}
        session={session}
        isRealized
      />
      <SessionRealization analysisState={analysisState} session={session} />
      {morningProposal ? <MorningProposalCompare proposal={morningProposal} /> : null}
      {prescribedPlan}
    </div>
  );
}

function UpcomingDerouleSection({
  morningProposal,
  deroulePanel,
}: {
  morningProposal?: MorningProposalCompareInput;
  deroulePanel: ReactNode;
}) {
  if (morningProposal) {
    return <MorningProposalCompare proposal={morningProposal} />;
  }
  return (
    <section aria-labelledby="session-deroule" className="space-y-4">
      <PlanSectionHeading heading="h3" id="session-deroule" title="Déroulé" />
      {deroulePanel}
    </section>
  );
}

function UpcomingAccessoriesBlock({
  session,
  secondaryDetails,
}: {
  session: ClientPlannedSession;
  secondaryDetails: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <SessionAccessoriesSection
        accessories={session.accessories}
        description={session.description}
        strengthPrescription={session.strengthPrescription}
        title={session.title}
        type={session.type}
      />
      {secondaryDetails}
    </div>
  );
}

export function PlannedSessionUpcomingView({
  session,
  headerActions,
  dateLabel,
  intentLine,
  goalTitle,
  morningProposal,
  deroulePanel,
  secondaryDetails,
}: {
  session: ClientPlannedSession;
  headerActions: PlannedSessionHeaderActions;
  dateLabel: string;
  intentLine?: string | null;
  goalTitle?: string | null;
  morningProposal?: MorningProposalCompareInput;
  deroulePanel: ReactNode;
  secondaryDetails: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-2">
        <PlannedSessionReadHeader
          actions={headerActions}
          dateLabel={dateLabel}
          intentLine={intentLine}
          isRealized={false}
          session={session}
        />
        {goalTitle ? <GoalLink title={goalTitle} /> : null}
      </div>
      <SensitiveZoneWarning session={session} />
      <UpcomingDerouleSection deroulePanel={deroulePanel} morningProposal={morningProposal} />
      <UpcomingAccessoriesBlock secondaryDetails={secondaryDetails} session={session} />
      <footer className="border-analysis-border/40 space-y-3 border-t pt-4">
        <SessionRealization session={session} />
      </footer>
    </div>
  );
}
