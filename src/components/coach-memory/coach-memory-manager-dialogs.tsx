'use client';

import {
  CoachMemoryAddButton,
  CoachMemoryDeleteDialog,
} from '@/components/coach-memory/coach-memory-manager-sections';
import { TravelMemoryFormDialog } from '@/components/coach-memory/travel-memory-form-dialog';
import type { useCoachMemoryManager } from '@/components/coach-memory/use-coach-memory-manager';

export function CoachMemoryManagerDialogs({
  manager,
}: {
  manager: ReturnType<typeof useCoachMemoryManager>;
}) {
  const formKey = manager.editingEntry?.id ?? (manager.formOpen ? 'new' : 'closed');

  return (
    <>
      <TravelMemoryFormDialog
        key={formKey}
        entry={manager.editingEntry}
        open={manager.formOpen}
        saving={manager.saving}
        onOpenChange={manager.setFormOpen}
        onSubmit={manager.handleSubmit}
      />

      <CoachMemoryDeleteDialog
        deleteTarget={manager.deleteTarget}
        guardDisabled={manager.guardDisabled}
        offline={manager.offline}
        offlineLabel={manager.offlineLabel}
        removePending={manager.removePending}
        onClose={() => manager.setDeleteTarget(null)}
        onConfirm={() => void manager.confirmDelete()}
      />
    </>
  );
}

export function CoachMemoryManagerInkActions({
  addDisabled,
  offline,
  offlineLabel,
  onAdd,
}: {
  addDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onAdd: () => void;
}) {
  return (
    <CoachMemoryAddButton
      disabled={addDisabled}
      offline={offline}
      offlineLabel={offlineLabel}
      onClick={onAdd}
      onInk
    />
  );
}
