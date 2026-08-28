'use client';

import { SessionRationaleCard } from '@/components/coach/plan/session-rationale-card';
import {
  PlannedSessionContextPanel,
  PlannedSessionContextPanelSkeleton,
} from '@/components/planning/session/edit/planned-session-context-panel';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { Brain, MapPin } from 'lucide-react';

function RationaleCollapsible({
  sessionId,
  openByDefault,
}: {
  sessionId: string;
  openByDefault: boolean;
}) {
  return (
    <CollapsibleSection defaultOpen={openByDefault} icon={Brain} label="Pourquoi cette séance">
      <SessionRationaleCard sessionId={sessionId} />
    </CollapsibleSection>
  );
}

function ContextCollapsible({
  sessionId,
  contextSummary,
  context,
  showContextPanel,
  onEdit,
}: {
  sessionId: string;
  contextSummary: string | null;
  context: PlannedSessionViewModel['context'] | null | undefined;
  showContextPanel: boolean;
  onEdit: () => void;
}) {
  return (
    <CollapsibleSection
      defaultOpen={false}
      icon={MapPin}
      label="Lieu & météo"
      summary={contextSummary}
    >
      {showContextPanel && context ? (
        <PlannedSessionContextPanel
          className="border-0 shadow-none"
          sessionId={sessionId}
          viewModel={context}
          onChangeLocation={onEdit}
        />
      ) : (
        <PlannedSessionContextPanelSkeleton className="border-0 shadow-none" />
      )}
    </CollapsibleSection>
  );
}

export function PlannedSessionReadSecondaryDetails({
  sessionId,
  hasRationale,
  rationaleOpenByDefault,
  showContextPanel,
  showContextSkeleton,
  contextSummary,
  context,
  onEdit,
}: {
  sessionId: string;
  hasRationale: boolean;
  rationaleOpenByDefault: boolean;
  showContextPanel: boolean;
  showContextSkeleton: boolean;
  contextSummary: string | null;
  context: PlannedSessionViewModel['context'] | null | undefined;
  onEdit: () => void;
}) {
  if (!hasRationale && !showContextPanel && !showContextSkeleton) {
    return null;
  }

  return (
    <div>
      {hasRationale ? (
        <RationaleCollapsible openByDefault={rationaleOpenByDefault} sessionId={sessionId} />
      ) : null}
      {showContextPanel || showContextSkeleton ? (
        <ContextCollapsible
          context={context}
          contextSummary={contextSummary}
          sessionId={sessionId}
          showContextPanel={showContextPanel}
          onEdit={onEdit}
        />
      ) : null}
    </div>
  );
}
