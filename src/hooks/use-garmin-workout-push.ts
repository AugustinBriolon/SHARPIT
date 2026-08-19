'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/query/keys';
import type { ClientPlannedSession } from '@/lib/query/types';

export type GarminWatchPushState = {
  workoutId: string | null;
  scheduledDate: string | null;
  pushedAt: string | null;
};

type GarminPushResponse = {
  error?: string;
  workoutName?: string;
  workoutId?: number | null;
  mapped?: Array<{ exercise: string; watchLabel: string; confidence: string }>;
  skipped?: Array<{ exercise: string }>;
  scheduledDate?: string | null;
  pushedAt?: string | null;
  alreadyPushed?: boolean;
  calendarActive?: boolean | null;
  workoutExists?: boolean | null;
  receipt?: { workoutId?: string; scheduledDate?: string | null };
};

function garminStatusHint(data: {
  workoutExists?: boolean | null;
  calendarActive?: boolean | null;
}): string | null {
  const parts: string[] = [];
  if (data.workoutExists === true) parts.push('workout encore dans Connect');
  else if (data.workoutExists === false) parts.push('workout introuvable dans Connect');
  if (data.calendarActive === true) parts.push('présent au calendrier');
  else if (data.calendarActive === false) parts.push('absent du calendrier');
  return parts.length > 0 ? parts.join(' · ') : null;
}

function patchPlannedSessionGarminFields(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
  fields: {
    garminWorkoutId: string | null;
    garminWorkoutScheduledDate: string | null;
    garminWorkoutPushedAt: Date | null;
  },
): void {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, (prev) => {
    if (!prev) return prev;
    return prev.map((session) => {
      if (session.id !== sessionId) return session;
      return {
        ...session,
        garminWorkoutId: fields.garminWorkoutId,
        garminWorkoutScheduledDate: fields.garminWorkoutScheduledDate,
        garminWorkoutPushedAt: fields.garminWorkoutPushedAt,
      };
    });
  });
}

/**
 * Push / re-push a planned strength session workout to Garmin Connect.
 * Preserves toast + 409 handling from the planned-session read view.
 */
export function useGarminWorkoutPush(session: {
  id: string;
  garminWorkoutId?: string | null;
  garminWorkoutScheduledDate?: string | null;
  garminWorkoutPushedAt?: Date | string | null;
}) {
  const queryClient = useQueryClient();
  const [pushing, setPushing] = useState(false);
  const [optimisticWatchPush, setOptimisticWatchPush] = useState<GarminWatchPushState | null>(null);

  useEffect(() => {
    setOptimisticWatchPush(null);
  }, [session.garminWorkoutId, session.garminWorkoutScheduledDate, session.garminWorkoutPushedAt]);

  const watchPush: GarminWatchPushState = optimisticWatchPush ?? {
    workoutId: session.garminWorkoutId ?? null,
    scheduledDate: session.garminWorkoutScheduledDate ?? null,
    pushedAt: session.garminWorkoutPushedAt
      ? new Date(session.garminWorkoutPushedAt).toISOString()
      : null,
  };

  const alreadyOnWatch = Boolean(watchPush.workoutId);

  const sendToWatch = useCallback(
    async (opts: { force?: boolean; canPush: boolean } = { canPush: true }) => {
      const forceRequested = Boolean(opts.force);
      if (pushing || !opts.canPush) return;

      let force = forceRequested;
      if (alreadyOnWatch && !force) {
        const ok = window.confirm(
          'Cette séance est déjà sur Garmin. Renvoyer remplace le workout précédent. Continuer ?',
        );
        if (!ok) return;
        force = true;
      }

      setPushing(true);
      const loadingToast = toast.loading(force ? 'Renvoi vers Garmin…' : 'Envoi vers Garmin…');
      try {
        const response = await fetch('/api/garmin/workouts/from-planned-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plannedSessionId: session.id, schedule: true, force }),
        });
        const data = (await response.json()) as GarminPushResponse;

        if (response.status === 409 && data.alreadyPushed) {
          const scheduled = data.receipt?.scheduledDate ?? watchPush.scheduledDate;
          toast.info('Déjà sur Garmin', {
            description: [scheduled ? `calendrier ${scheduled}` : null, garminStatusHint(data)]
              .filter(Boolean)
              .join(' · '),
          });
          return;
        }

        if (!response.ok) throw new Error(data.error || 'Envoi impossible');

        const skipped = data.skipped?.length ?? 0;
        const mappedCount = data.mapped?.length ?? 0;
        const approximated =
          data.mapped?.filter((step) => step.confidence === 'fallback').length ?? 0;
        const nextPush: GarminWatchPushState = {
          workoutId: data.workoutId != null ? String(data.workoutId) : watchPush.workoutId,
          scheduledDate: data.scheduledDate ?? watchPush.scheduledDate,
          pushedAt: data.pushedAt ?? new Date().toISOString(),
        };
        setOptimisticWatchPush(nextPush);
        patchPlannedSessionGarminFields(queryClient, session.id, {
          garminWorkoutId: nextPush.workoutId,
          garminWorkoutScheduledDate: nextPush.scheduledDate,
          garminWorkoutPushedAt: nextPush.pushedAt ? new Date(nextPush.pushedAt) : null,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });

        toast.success(force ? 'Workout renvoyé à Garmin' : 'Workout envoyé à Garmin', {
          description: [
            data.workoutName,
            mappedCount > 0 ? `${mappedCount} exercices` : null,
            data.scheduledDate ? `calendrier ${data.scheduledDate}` : null,
            approximated > 0 ? `${approximated} en nom générique` : null,
            skipped > 0 ? `${skipped} omis (hors catalogue)` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Envoi vers Garmin impossible');
      } finally {
        toast.close(loadingToast);
        setPushing(false);
      }
    },
    [
      alreadyOnWatch,
      pushing,
      queryClient,
      session.id,
      watchPush.scheduledDate,
      watchPush.workoutId,
    ],
  );

  return {
    pushing,
    watchPush,
    alreadyOnWatch,
    sendToWatch,
  };
}
