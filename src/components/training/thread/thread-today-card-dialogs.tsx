'use client';

import { ThreadEaseDialog } from '@/components/training/thread/thread-ease-dialog';
import { ThreadShiftDialog } from '@/components/training/thread/thread-shift-dialog';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

export function ThreadTodayCardDialogs({
  easeOpen,
  entry,
  onEase,
  onReschedule,
  onSetEaseOpen,
  onSetShiftOpen,
  shiftOpen,
}: {
  easeOpen: boolean;
  entry: ThreadEntry;
  onEase: () => void;
  onReschedule: (day: string, startTime: string | null) => void;
  onSetEaseOpen: (open: boolean) => void;
  onSetShiftOpen: (open: boolean) => void;
  shiftOpen: boolean;
}) {
  if (!entry.planned) {
    return null;
  }

  return (
    <>
      <ThreadShiftDialog
        open={shiftOpen}
        session={entry.planned}
        onConfirm={onReschedule}
        onOpenChange={onSetShiftOpen}
      />
      <ThreadEaseDialog
        open={easeOpen}
        session={entry.planned}
        onConfirm={onEase}
        onOpenChange={onSetEaseOpen}
      />
    </>
  );
}
