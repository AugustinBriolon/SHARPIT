'use client';

import { CorpsDisclaimer } from '@/components/corps/corps-ui';
import { useState } from 'react';
import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';
import { usePhysicalNotes } from '@/hooks/use-physical';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { PhysicalNoteDialog } from './dialogs/physical-note-dialog';
import { aggregateDisplayValues } from '@/components/physical-health/physical-health-page-helpers';
import { PhysicalHealthPageHeader } from '@/components/physical-health/physical-health-page-header';
import { PhysicalHealthConditionSections } from '@/components/physical-health/physical-health-condition-sections';
import { PhysicalHealthStatsGrid } from '@/components/physical-health/physical-health-page-sections';

type DialogState = { mode: 'create' } | { mode: 'edit'; note: ClientPhysicalNote } | null;

export function PhysicalHealthPageView({
  embedded = false,
  loading = false,
  viewModel,
}: {
  viewModel: PhysicalHealthViewModel;
  embedded?: boolean;
  loading?: boolean;
}) {
  const notesQuery = usePhysicalNotes();
  const [dialog, setDialog] = useState<DialogState>(null);

  function openLegacyCheckin(legacyNoteId: string) {
    const note = notesQuery.data?.find((n) => n.id === legacyNoteId);
    if (note) {
      setDialog({ mode: 'edit', note });
    }
  }

  const display = aggregateDisplayValues(loading, viewModel.aggregate);

  return (
    <div aria-busy={loading || undefined} className="space-y-4">
      <PhysicalHealthPageHeader
        embedded={embedded}
        loading={loading}
        onCreate={() => setDialog({ mode: 'create' })}
      />

      <PhysicalHealthStatsGrid
        aggregate={viewModel.aggregate}
        display={display}
        loading={loading}
      />

      <PhysicalHealthConditionSections
        embedded={embedded}
        loading={loading}
        viewModel={viewModel}
        onEditLegacy={openLegacyCheckin}
      />

      <CorpsDisclaimer title="Aide à la décision, pas un avis médical">
        {viewModel.medicalDisclaimer}
      </CorpsDisclaimer>

      {dialog && !loading ? (
        <PhysicalNoteDialog
          note={dialog.mode === 'edit' ? dialog.note : undefined}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
