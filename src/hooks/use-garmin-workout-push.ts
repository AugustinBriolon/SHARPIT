'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { buildPushToastDescription } from '@/lib/integrations/garmin/garmin-push-summary';
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
  mapped?: Array<{
    exercise?: string;
    watchLabel?: string;
    confidence?: string;
    kind?: string;
    durationLabel?: string;
    targetLabel?: string | null;
  }>;
  skipped?: Array<{ exercise: string }>;
  stepCount?: number;
  derived?: boolean;
  warnings?: string[];
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
  if (data.workoutExists === true) {
    parts.push('workout encore dans Connect');
  } else if (data.workoutExists === false) {
    parts.push('workout introuvable dans Connect');
  }
  if (data.calendarActive === true) {
    parts.push('présent au calendrier');
  } else if (data.calendarActive === false) {
    parts.push('absent du calendrier');
  }
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
    if (!prev) {
      return prev;
    }
    return prev.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }
      return { ...session, ...fields };
    });
  });
}

function alreadyPushedToast(data: GarminPushResponse, scheduledDate: string | null): void {
  toast.info('Déjà sur Garmin', {
    description: [scheduledDate ? `calendrier ${scheduledDate}` : null, garminStatusHint(data)]
      .filter(Boolean)
      .join(' · '),
  });
}

async function pushPlannedSessionToGarmin(
  sessionId: string,
  force: boolean,
): Promise<GarminPushResponse & { ok: boolean; status: number }> {
  const response = await fetch('/api/garmin/workouts/from-planned-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plannedSessionId: sessionId, schedule: true, force }),
  });
  const data = (await response.json()) as GarminPushResponse;
  return { ...data, ok: response.ok, status: response.status };
}

function confirmGarminRepush(alreadyOnWatch: boolean, forceRequested: boolean): boolean | 'cancel' {
  if (!alreadyOnWatch || forceRequested) {
    return forceRequested;
  }
  const ok = window.confirm(
    'Cette séance est déjà sur Garmin. Renvoyer remplace le workout précédent. Continuer ?',
  );
  return ok ? true : 'cancel';
}

function buildNextGarminPush(
  data: GarminPushResponse,
  watchPush: GarminWatchPushState,
): GarminWatchPushState {
  return {
    workoutId: data.workoutId !== null ? String(data.workoutId) : watchPush.workoutId,
    scheduledDate: data.scheduledDate ?? watchPush.scheduledDate,
    pushedAt: data.pushedAt ?? new Date().toISOString(),
  };
}

type ApplyGarminPushSuccessOptions = {
  data: GarminPushResponse;
  watchPush: GarminWatchPushState;
  queryClient: ReturnType<typeof useQueryClient>;
  sessionId: string;
  force: boolean;
  setOptimisticWatchPush: (state: GarminWatchPushState) => void;
};

function applyGarminPushSuccess(opts: ApplyGarminPushSuccessOptions): void {
  const nextPush = buildNextGarminPush(opts.data, opts.watchPush);
  opts.setOptimisticWatchPush(nextPush);
  patchPlannedSessionGarminFields(opts.queryClient, opts.sessionId, {
    garminWorkoutId: nextPush.workoutId,
    garminWorkoutScheduledDate: nextPush.scheduledDate,
    garminWorkoutPushedAt: nextPush.pushedAt ? new Date(nextPush.pushedAt) : null,
  });
  void opts.queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  toast.success(opts.force ? 'Workout renvoyé à Garmin' : 'Workout envoyé à Garmin', {
    description: buildPushToastDescription(opts.data),
  });
}

type ExecuteGarminWatchPushOptions = Omit<ApplyGarminPushSuccessOptions, 'data'>;

async function executeGarminWatchPush(opts: ExecuteGarminWatchPushOptions): Promise<void> {
  const data = await pushPlannedSessionToGarmin(opts.sessionId, opts.force);
  if (data.status === 409 && data.alreadyPushed) {
    alreadyPushedToast(data, data.receipt?.scheduledDate ?? opts.watchPush.scheduledDate);
    return;
  }
  if (!data.ok) {
    throw new Error(data.error || 'Envoi impossible');
  }
  applyGarminPushSuccess({ ...opts, data });
}

/**
 * Push / re-push a planned session workout to Garmin Connect — strength or
 * endurance, the route dispatches on the session sport.
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
      if (pushing || !opts.canPush) {
        return;
      }
      const confirmResult = confirmGarminRepush(alreadyOnWatch, Boolean(opts.force));
      if (confirmResult === 'cancel') {
        return;
      }

      setPushing(true);
      const loadingToast = toast.loading(
        confirmResult ? 'Renvoi vers Garmin…' : 'Envoi vers Garmin…',
      );
      try {
        await executeGarminWatchPush({
          watchPush,
          queryClient,
          sessionId: session.id,
          force: confirmResult,
          setOptimisticWatchPush,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Envoi vers Garmin impossible');
      } finally {
        toast.close(loadingToast);
        setPushing(false);
      }
    },
    [alreadyOnWatch, pushing, queryClient, session.id, watchPush],
  );

  return { pushing, watchPush, alreadyOnWatch, sendToWatch };
}
