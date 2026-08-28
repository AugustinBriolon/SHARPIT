'use client';

import { CoachMemoryDatedSection } from '@/components/coach-memory/coach-memory-dated-section';
import { CoachMemoryInkBand } from '@/components/coach-memory/coach-memory-ink-band';
import {
  CoachMemoryManagerDialogs,
  CoachMemoryManagerInkActions,
} from '@/components/coach-memory/coach-memory-manager-dialogs';
import { CoachProfileContextSection } from '@/components/coach-memory/coach-profile-context-section';
import { useCoachMemoryManager } from '@/components/coach-memory/use-coach-memory-manager';

export function CoachMemoryManager({ focusId = null }: { focusId?: string | null }) {
  const manager = useCoachMemoryManager(focusId);
  const addDisabled = Boolean(manager.loadError) || manager.guardDisabled;

  return (
    <div className="space-y-6 sm:space-y-8">
      <CoachMemoryInkBand
        entries={manager.entries}
        profileContext={manager.profileContext}
        actions={
          <CoachMemoryManagerInkActions
            addDisabled={addDisabled}
            offline={manager.offline}
            offlineLabel={manager.offlineLabel}
            onAdd={manager.openCreate}
          />
        }
      />

      <CoachProfileContextSection
        loadError={manager.loadError}
        loading={manager.loading}
        savedContext={manager.profileContext}
      />

      <CoachMemoryDatedSection
        deletePendingId={manager.removePending ? (manager.deleteTarget?.id ?? null) : null}
        entries={manager.entries}
        focusId={focusId}
        guardDisabled={manager.guardDisabled}
        loadError={manager.loadError}
        loading={manager.loading}
        offline={manager.offline}
        offlineLabel={manager.offlineLabel}
        onAdd={manager.openCreate}
        onDelete={manager.setDeleteTarget}
        onEdit={manager.openEdit}
      />

      <CoachMemoryManagerDialogs manager={manager} />
    </div>
  );
}
