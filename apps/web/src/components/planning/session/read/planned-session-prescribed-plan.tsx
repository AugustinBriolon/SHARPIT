'use client';

import type { ReactNode } from 'react';
import { ClipboardList } from 'lucide-react';
import { SessionAccessoriesSection } from '../accessories/session-accessories-section';
import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';
import { intensityLabels } from '@sharpit/server/lib/planned-session/sessions';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { SensitiveZoneWarning } from '@/components/planning/session/read/planned-session-read-sensitive-zone';

export function PrescribedPlanCollapsible({
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
