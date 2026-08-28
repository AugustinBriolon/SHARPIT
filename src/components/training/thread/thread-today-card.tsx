'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { entryMeta } from '@/components/training/thread/thread-entry-row-meta';
import { ThreadEaseDialog } from '@/components/training/thread/thread-ease-dialog';
import { ThreadShiftDialog } from '@/components/training/thread/thread-shift-dialog';
import {
  ThreadTodayCardActions,
  ThreadTodayCardHeader,
} from '@/components/training/thread/thread-today-card-parts';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { usePlannedSessionActions } from '@/hooks/use-planned-session-actions';
import { useAppModal } from '@/providers/app-modal-provider';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';

function ThreadTodayCardShell({
  sessionId,
  entryTitle,
  instruction,
  children,
  onOpen,
  onPrefetch,
}: {
  sessionId: string | null;
  entryTitle: string;
  instruction: string | null;
  children: React.ReactNode;
  onOpen: () => void;
  onPrefetch: () => void;
}) {
  return (
    <div
      className={cn(
        'chip-surface-lg rounded-analysis-lg relative px-4 py-4',
        sessionId && 'hover:border-primary/25 transition-colors',
      )}
      onPointerEnter={onPrefetch}
    >
      {sessionId ? (
        <button
          aria-label={`Ouvrir ${entryTitle}`}
          className="focus-visible:ring-primary/35 rounded-analysis-lg absolute inset-0 z-0 cursor-pointer focus-visible:ring-2 focus-visible:outline-hidden"
          type="button"
          onClick={onOpen}
        />
      ) : null}

      {children}

      {instruction ? (
        <p className="text-foreground/85 pointer-events-none relative z-[1] mt-3 pl-3 text-[13.5px] leading-relaxed">
          {instruction}
        </p>
      ) : null}
    </div>
  );
}

export function ThreadTodayCard({
  entry,
  instruction,
}: {
  entry: ThreadEntry;
  instruction: string | null;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();
  const { mode } = useDisplayMode();
  const { ease, reschedule, pending } = usePlannedSessionActions();
  const [shiftOpen, setShiftOpen] = useState(false);
  const [easeOpen, setEaseOpen] = useState(false);

  const sessionId = entry.planned?.id ?? null;
  const meta = entryMeta(entry, mode);

  const open = () => {
    if (sessionId) {
      openPlannedSession({ sessionId });
    }
  };

  return (
    <>
      <ThreadTodayCardShell
        entryTitle={entry.title}
        instruction={instruction}
        sessionId={sessionId}
        onOpen={open}
        onPrefetch={() => sessionId && prefetchPlannedSessionDetail(queryClient, sessionId)}
      >
        <ThreadTodayCardHeader entry={entry} meta={meta} sessionId={sessionId} />

        {sessionId && entry.planned ? (
          <ThreadTodayCardActions
            pending={pending}
            planned={entry.planned}
            sessionId={sessionId}
            onEase={() => setEaseOpen(true)}
            onShift={() => setShiftOpen(true)}
          />
        ) : null}
      </ThreadTodayCardShell>

      {entry.planned ? (
        <>
          <ThreadShiftDialog
            open={shiftOpen}
            session={entry.planned}
            onConfirm={(day, startTime) => reschedule(entry.planned!, day, startTime)}
            onOpenChange={setShiftOpen}
          />
          <ThreadEaseDialog
            open={easeOpen}
            session={entry.planned}
            onConfirm={() => ease(entry.planned!)}
            onOpenChange={setEaseOpen}
          />
        </>
      ) : null}
    </>
  );
}
