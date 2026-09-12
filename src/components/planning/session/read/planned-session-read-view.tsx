'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClipboardList, Target } from 'lucide-react';
import { DiscussWithCoachButton } from '@/components/coach/discuss/discuss-with-coach-button';
import { MorningProposalCompare } from '@/components/planning/session/read/morning-proposal-compare';
import { SessionAccessoriesSection } from '../accessories/session-accessories-section';
import { SessionRealization } from '../realize/session-realization';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { intensityLabels } from '@/lib/planned-session/sessions';
import type { MorningProposalCompareInput } from '@/lib/today/rich/morning-proposal-compare';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';
import { usePlannedSessionReadData } from '@/components/planning/session/read/use-planned-session-read-data';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { sessionZoneFlags } from '@/lib/physical-health/sensitive-zone-audit';
import { sensitiveZonesFrom } from '@/lib/physical-health/sensitive-zones';
import { PlannedSessionReadHeader } from '@/components/planning/session/read/planned-session-read-header';
import { PlannedSessionDeroulePanel } from '@/components/planning/session/read/planned-session-deroule-panel';
import { PlannedSessionReadSecondaryDetails } from '@/components/planning/session/read/planned-session-read-secondary';
import { MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';

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

/**
 * A session planned before the injury was declared still carries its old
 * exercises — say so where the athlete is about to follow it.
 */
function SensitiveZoneWarning({ session }: { session: ClientPlannedSession }) {
  const notesQuery = usePhysicalNotes();
  const zones = sensitiveZonesFrom(notesQuery.data ?? []);
  const flags = sessionZoneFlags(session, zones);

  if (flags.length === 0) {
    return null;
  }

  const zoneLabels = [...new Set(flags.map((flag) => flag.zone.label))].join(', ');
  const exercises = [...new Set(flags.map((flag) => flag.exercise))].join(', ');

  return (
    <p className="border-signal-vo2/30 bg-signal-vo2/8 text-signal-vo2 rounded-lg border px-3 py-2 text-xs">
      Cette séance charge une zone que tu protèges ({zoneLabels}) : {exercises}. Adapte ou remplace
      ces exercices.
    </p>
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
          <SensitiveZoneWarning session={session} />
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

function BeforeSessionActions({
  session,
  omitLinkedActivityNavigation,
}: {
  session: ClientPlannedSession;
  omitLinkedActivityNavigation?: boolean;
}) {
  return (
    <footer className="border-analysis-border/40 space-y-3 border-t pt-4">
      <SessionRealization
        omitLinkedActivityNavigation={omitLinkedActivityNavigation}
        session={session}
      />
      <DiscussWithCoachButton
        className="w-full sm:w-auto"
        size="sm"
        target={{ kind: 'planned-session', sessionId: session.id }}
        variant="outline"
      />
    </footer>
  );
}

/**
 * BEFORE_SESSION prepares; SESSION_COMPLETED reads — two compositions, not one template.
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
      hero={!readData.isRealized}
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
      intentLine={readData.intentLine}
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
      rationaleOpenByDefault={false}
      sessionId={session.id}
      showContextPanel={readData.showContextPanel}
      showContextSkeleton={readData.showContextSkeleton}
      onEdit={onEdit}
    />
  );

  if (readData.isRealized) {
    return (
      <div className="min-w-0 space-y-6">
        {header}
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
    <div className="min-w-0 space-y-6">
      <div className="space-y-2">
        {header}
        {readData.goal ? <GoalLink title={readData.goal.title} /> : null}
      </div>

      {morningProposal ? (
        <MorningProposalCompare proposal={morningProposal} />
      ) : (
        <section aria-labelledby="session-deroule" className="space-y-4">
          <PlanSectionHeading heading="h3" id="session-deroule" title="Déroulé" />
          {deroulePanel}
        </section>
      )}

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

      <BeforeSessionActions
        omitLinkedActivityNavigation={omitLinkedActivityNavigation}
        session={session}
      />
    </div>
  );
}
