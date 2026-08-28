'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import type { ReactNode } from 'react';
import { MorningProposalCompare } from '../edit/morning-proposal-compare';
import { SessionAccessoriesSection } from '../accessories/session-accessories-section';
import { SessionRealization } from '../realize/session-realization';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { intensityLabels } from '@/lib/planned-session/sessions';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import { ClipboardList } from 'lucide-react';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { cn } from '@/lib/utils';
import { usePlannedSessionReadData } from '@/components/planning/session/read/use-planned-session-read-data';
import { PlannedSessionReadHeader } from '@/components/planning/session/read/planned-session-read-header';
import { PlannedSessionDeroulePanel } from '@/components/planning/session/read/planned-session-deroule-panel';
import { PlannedSessionReadSecondaryDetails } from '@/components/planning/session/read/planned-session-read-secondary';

type KeyChip = { label: string; value: string; valueClassName?: string };

function KeyChipsRow({ chips }: { chips: KeyChip[] }) {
  return (
    <div
      className={cn('grid gap-2', chips.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}
    >
      {chips.map((chip) => (
        <div key={chip.label} className="chip-surface rounded-analysis px-3 py-2.5">
          <p className="text-label truncate">{chip.label}</p>
          <p className={cn('text-data mt-0.5 text-sm font-semibold', chip.valueClassName)}>
            {chip.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PrescribedPlanCollapsible({
  session,
  deroulePanel,
  secondaryDetails,
}: {
  session: ClientPlannedSession;
  deroulePanel: ReactNode;
  secondaryDetails: ReactNode;
}) {
  return (
    <div>
      <CollapsibleSection
        defaultOpen={false}
        icon={ClipboardList}
        label="Plan prescrit"
        summary={
          session.durationMin !== null
            ? `${session.durationMin} min${session.intensity ? ` · ${intensityLabels[session.intensity]}` : ''}`
            : null
        }
      >
        <div className="space-y-3">
          {deroulePanel}
          <SessionAccessoriesSection
            accessories={session.accessories}
            description={session.description}
            strengthPrescription={session.strengthPrescription}
            title={session.title}
            type={session.type}
          />
        </div>
      </CollapsibleSection>
      {secondaryDetails}
    </div>
  );
}

/**
 * Glanceable read layout for the planned-session modal.
 * Realized sessions lead with the unified coach story; plan details fold below.
 */
export function PlannedSessionReadView({
  session,
  goals,
  context,
  contextPending = false,
  onEdit,
  omitLinkedActivityNavigation = false,
  morningProposal,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending?: boolean;
  onEdit: () => void;
  omitLinkedActivityNavigation?: boolean;
  morningProposal?: MorningProposalCompareInput;
}) {
  const readData = usePlannedSessionReadData({ session, goals, context, contextPending });

  const deroulePanel = !morningProposal ? (
    <PlannedSessionDeroulePanel
      endurancePreview={readData.endurancePreview}
      freeTextDeroule={readData.freeTextDeroule}
      garminPush={readData.garminPush}
      hasEndurancePlan={readData.hasEndurancePlan}
      hasExerciseMedia={readData.hasExerciseMedia}
      hasStrengthPlan={readData.hasStrengthPlan}
      hasStructuredDeroule={readData.hasStructuredDeroule}
      isRealized={readData.isRealized}
      orderedSets={readData.orderedSets}
      prescription={readData.prescription}
      strengthIntent={readData.strengthIntent}
      watchStaleness={readData.watchStaleness}
    />
  ) : null;

  const header = (
    <PlannedSessionReadHeader
      dateLabel={readData.dateLabel}
      isRealized={readData.isRealized}
      session={session}
      onEdit={onEdit}
    />
  );

  const secondaryDetails = (
    <PlannedSessionReadSecondaryDetails
      context={context}
      contextSummary={readData.contextSummary}
      hasRationale={readData.hasRationale}
      rationaleOpenByDefault={readData.rationaleOpenByDefault}
      sessionId={session.id}
      showContextPanel={readData.showContextPanel}
      showContextSkeleton={readData.showContextSkeleton}
      onEdit={onEdit}
    />
  );

  if (readData.isRealized) {
    return (
      <div className="min-w-0 space-y-4">
        {header}
        {!morningProposal ? <KeyChipsRow chips={readData.realizedChips} /> : null}
        <SessionRealization
          omitLinkedActivityNavigation={omitLinkedActivityNavigation}
          session={session}
        />
        {morningProposal ? <MorningProposalCompare proposal={morningProposal} /> : null}
        <PrescribedPlanCollapsible
          deroulePanel={deroulePanel}
          secondaryDetails={secondaryDetails}
          session={session}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {header}
      {morningProposal ? (
        <MorningProposalCompare proposal={morningProposal} />
      ) : (
        <KeyChipsRow chips={readData.chips} />
      )}
      {deroulePanel}
      <SessionAccessoriesSection
        accessories={session.accessories}
        description={session.description}
        strengthPrescription={session.strengthPrescription}
        title={session.title}
        type={session.type}
      />
      {secondaryDetails}
      <div className="border-analysis-border/60 space-y-2 border-t pt-3">
        <DiscussWithCoachButton
          className="w-full sm:w-auto"
          size="lg"
          target={{ kind: 'planned-session', sessionId: session.id }}
          variant="default"
        />
        <SessionRealization
          omitLinkedActivityNavigation={omitLinkedActivityNavigation}
          session={session}
        />
      </div>
    </div>
  );
}
