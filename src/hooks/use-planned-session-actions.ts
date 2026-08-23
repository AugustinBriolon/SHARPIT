'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { usePlannedSessionMutations } from '@/hooks/use-planned-sessions';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  easeSession,
  moveToDay,
  shiftByOneDay,
  undoOf,
  type SessionAdjustment,
} from '@/lib/training/thread/session-adjust';

/**
 * Adjusting a session without leaving the thread.
 *
 * These are the two things an athlete does to a plan on a bad morning, and both
 * used to mean opening a dialog, editing a field and saving. Now they are one
 * press, applied optimistically, with the previous values held for five seconds
 * behind an "Annuler".
 *
 * Undo rather than confirm: a confirm dialog taxes every correct press to guard
 * against the rare wrong one. An undo costs nothing until it is needed, and it is
 * honest about what happened — the change is already visible when it offers to
 * take it back.
 */

const UNDO_TIMEOUT_MS = 6_000;

export function usePlannedSessionActions() {
  const { update } = usePlannedSessionMutations();

  const apply = useCallback(
    (session: ClientPlannedSession, adjustment: SessionAdjustment, announcement: string) => {
      const previous = undoOf(session, adjustment);

      update.mutate({ id: session.id, data: adjustment as never, silent: true });

      toast.success(announcement, {
        timeout: UNDO_TIMEOUT_MS,
        actionProps: {
          children: 'Annuler',
          onClick: () => update.mutate({ id: session.id, data: previous as never, silent: true }),
        },
      });
    },
    [update],
  );

  const shift = useCallback(
    (session: ClientPlannedSession) => {
      apply(session, shiftByOneDay(session), 'Séance décalée d’un jour');
    },
    [apply],
  );

  const ease = useCallback(
    (session: ClientPlannedSession) => {
      const adjustment = easeSession(session);
      if (!adjustment) {
        // Refusing is the honest outcome: there is no duration or load to cut, and
        // a toast saying "allégée" over an unchanged session would be a lie.
        toast.info('Rien à alléger sur cette séance');
        return;
      }
      apply(session, adjustment, 'Séance allégée d’un quart');
    },
    [apply],
  );

  const moveTo = useCallback(
    (session: ClientPlannedSession, target: Date) => {
      const adjustment = moveToDay(session, target);
      // A drop back onto the same day is a no-op; announcing it would be noise.
      if (!adjustment) return;
      apply(
        session,
        adjustment,
        `Séance déplacée au ${format(target, 'EEEE d MMMM', { locale: fr })}`,
      );
    },
    [apply],
  );

  return { shift, ease, moveTo, pending: update.isPending };
}
