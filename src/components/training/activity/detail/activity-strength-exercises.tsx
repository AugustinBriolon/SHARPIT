'use client';

import { useState } from 'react';
import { Dumbbell, Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ExerciseIndex,
  ExerciseMediaAttribution,
  ExerciseMediaCaption,
  ExerciseVisual,
} from '@/components/sessions/exercise-visual';
import { toast } from '@/components/ui/toast';
import { resolveStrengthSetMedia } from '@/lib/exercises';
import type { ActivityDetail } from '@/components/training/activity/detail/types';
import {
  formatStrengthSetDetail,
  sendActivityStrengthToGarmin,
} from '@/components/training/activity/detail/activity-strength-exercises-helpers';

/** Narrow client payload — id + strength sets only. */
export type ActivityStrengthExercisesActivity = Pick<ActivityDetail, 'id' | 'strengthSets'>;

function StrengthSetRow({
  set,
  index,
}: {
  set: ActivityDetail['strengthSets'][number];
  index: number;
}) {
  const volume = set.sets * set.reps * (set.weightKg ?? 0);
  const media = resolveStrengthSetMedia(set);

  return (
    <div className="border-analysis-border rounded-analysis flex items-start gap-3 border px-3 py-3 sm:items-center sm:px-4">
      {media ? (
        <ExerciseVisual label={set.exercise} media={media} />
      ) : (
        <ExerciseIndex className="text-muted-foreground" index={index + 1} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="min-w-0 flex-1 font-medium">
          {set.exercise}
          {media ? <ExerciseMediaCaption media={media} /> : null}
          {set.notes ? (
            <span className="text-muted-foreground block text-xs font-normal wrap-break-word">
              {set.notes}
            </span>
          ) : null}
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          <span className="font-mono text-sm tabular-nums">{formatStrengthSetDetail(set)}</span>
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            {volume > 0 && <span className="font-mono">{Math.round(volume)} kg</span>}
            {set.rpe !== null && (
              <span className="border-border rounded-full border px-2 py-0.5 font-mono">
                RPE {set.rpe}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActivityStrengthExercises({
  activity,
}: {
  activity: ActivityStrengthExercisesActivity;
}) {
  const sets = activity.strengthSets;
  const [pushing, setPushing] = useState(false);

  async function sendToWatch() {
    if (pushing || sets.length === 0) {
      return;
    }
    setPushing(true);
    const loadingToast = toast.loading('Envoi vers Garmin…');
    try {
      await sendActivityStrengthToGarmin(activity.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Envoi vers Garmin impossible');
    } finally {
      toast.close(loadingToast);
      setPushing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <Dumbbell className="text-muted-foreground size-4" />
          Exercices
        </CardTitle>
        {sets.length > 0 ? (
          <Button
            className="h-8 shrink-0 gap-1 px-2.5 text-xs lg:h-7"
            disabled={pushing}
            size="xs"
            type="button"
            variant="outline"
            onClick={() => void sendToWatch()}
          >
            <Watch className="size-3.5" />
            <span className="hidden sm:inline">{pushing ? 'Envoi…' : 'Envoyer à la montre'}</span>
            <span className="sm:hidden">{pushing ? 'Envoi…' : 'Montre'}</span>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {sets.length > 0 ? (
          <>
            {sets.map((set, i) => (
              <StrengthSetRow key={set.id} index={i} set={set} />
            ))}
            <ExerciseMediaAttribution>
              « Envoyer à la montre » crée un workout Garmin (bibliothèque + calendrier) —
              synchroniser la montre ensuite.
            </ExerciseMediaAttribution>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucun exercice enregistré pour cette séance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
