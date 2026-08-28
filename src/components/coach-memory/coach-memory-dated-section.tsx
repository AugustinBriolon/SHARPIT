'use client';

import {
  CoachMemoryAddButton,
  CoachMemoryEntriesList,
} from '@/components/coach-memory/coach-memory-manager-sections';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';

export function CoachMemoryDatedSection({
  entries,
  focusId,
  loadError,
  loading,
  deletePendingId,
  guardDisabled,
  offline,
  offlineLabel,
  onAdd,
  onDelete,
  onEdit,
}: {
  entries: CoachMemoryEntry[];
  focusId?: string | null;
  loadError: string | null;
  loading: boolean;
  deletePendingId: string | null;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onAdd: () => void;
  onDelete: (entry: CoachMemoryEntry) => void;
  onEdit: (entry: CoachMemoryEntry) => void;
}) {
  const addDisabled = Boolean(loadError) || guardDisabled;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label text-signal-caution mb-1">Daté</p>
          <h2 className="text-section-title">Déplacements & contraintes</h2>
        </div>
        <div className="shrink-0 lg:hidden">
          <CoachMemoryAddButton
            disabled={addDisabled}
            offline={offline}
            offlineLabel={offlineLabel}
            onClick={onAdd}
          />
        </div>
      </div>

      <CoachMemoryEntriesList
        deletePendingId={deletePendingId}
        entries={entries}
        focusId={focusId}
        guardDisabled={guardDisabled}
        loadError={loadError}
        loading={loading}
        offline={offline}
        offlineLabel={offlineLabel}
        onAdd={onAdd}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </section>
  );
}
