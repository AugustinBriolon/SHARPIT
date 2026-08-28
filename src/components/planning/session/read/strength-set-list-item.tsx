'use client';

import {
  ExerciseIndex,
  ExerciseMediaCaption,
  ExerciseVisual,
} from '@/components/sessions/exercise-visual';
import { resolveStrengthSetMedia } from '@/lib/exercises';
import { strengthSetWatchCompat } from '@/lib/planned-session/strength/strength-prescription';
import { cn } from '@/lib/utils';

type StrengthSet = {
  order: number;
  exercise: string;
  sets: number;
  reps: number;
  durationSec: number | null;
  weightKg: number | null;
  restMode: string;
  restSec: number | null;
};

function strengthSetVolumeLabel(set: StrengthSet): string {
  if (set.durationSec && set.durationSec > 0 && set.reps <= 0) {
    return `${set.sets}×${set.durationSec}s`;
  }
  return `${set.sets}×${set.reps}`;
}

function strengthRestLabel(set: StrengthSet): string {
  if (set.restMode === 'time' && set.restSec !== null && set.restSec > 0) {
    return `Repos ${set.restSec}s`;
  }
  return 'Repos Lap';
}

export function StrengthSetListItem({ set, index }: { set: StrengthSet; index: number }) {
  const volume = strengthSetVolumeLabel(set);
  const weight = set.weightKg !== null && set.weightKg > 0 ? ` @ ${set.weightKg} kg` : '';
  const watch = strengthSetWatchCompat(set);
  const media = resolveStrengthSetMedia(set);

  return (
    <li className="flex items-start gap-3 text-sm">
      {media ? (
        <ExerciseVisual label={set.exercise} media={media} />
      ) : (
        <ExerciseIndex className="text-muted-foreground" index={index + 1} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="text-muted-foreground flex items-baseline justify-between gap-2">
          <span className="text-foreground min-w-0 font-medium wrap-break-word">
            {set.exercise}
          </span>
          <span className="text-data shrink-0 font-mono text-xs tabular-nums">
            {volume}
            {weight}
          </span>
        </div>
        {media ? <ExerciseMediaCaption media={media} /> : null}
        <p className="text-muted-foreground text-xs leading-snug">{strengthRestLabel(set)}</p>
        <p
          className={cn(
            'text-xs leading-snug',
            watch.status === 'unknown' && 'text-muted-foreground',
            watch.status === 'approx' && 'text-amber-700 dark:text-amber-400',
            watch.status === 'ready' && 'text-muted-foreground',
          )}
        >
          {watch.label}
        </p>
      </div>
    </li>
  );
}
