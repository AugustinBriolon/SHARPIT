'use client';

import {
  ExerciseIndex,
  ExerciseMediaCaption,
  ExerciseVisual,
} from '@/components/sessions/exercise-visual';
import { resolveStrengthSetMedia } from '@/lib/exercises';
import {
  strengthSetWatchCompat,
  type StrengthPrescriptionSet,
} from '@/lib/planned-session/strength/strength-prescription';
import { cn } from '@/lib/utils';

function strengthSetVolumeLabel(set: StrengthPrescriptionSet): string {
  if (set.durationSec && set.durationSec > 0 && set.reps <= 0) {
    return `${set.sets}×${set.durationSec}s`;
  }
  return `${set.sets}×${set.reps}`;
}

function strengthRestLabel(set: StrengthPrescriptionSet): string {
  if (set.restMode === 'time' && (set.restSec ?? 0) > 0) {
    return `Repos ${set.restSec}s`;
  }
  return 'Repos Lap';
}

function strengthWeightSuffix(set: StrengthPrescriptionSet): string {
  if (set.weightKg === undefined || set.weightKg === null || set.weightKg <= 0) {
    return '';
  }
  return ` @ ${set.weightKg} kg`;
}

function strengthWatchClassName(status: ReturnType<typeof strengthSetWatchCompat>['status']) {
  return cn(
    'text-xs leading-snug',
    status === 'unknown' && 'text-muted-foreground',
    status === 'approx' && 'text-amber-700 dark:text-amber-400',
    status === 'ready' && 'text-muted-foreground',
  );
}

function StrengthSetLeadingVisual({
  set,
  index,
  media,
}: {
  set: StrengthPrescriptionSet;
  index: number;
  media: ReturnType<typeof resolveStrengthSetMedia>;
}) {
  if (media) {
    return <ExerciseVisual label={set.exercise} media={media} />;
  }
  return <ExerciseIndex className="text-muted-foreground" index={index + 1} />;
}

export function StrengthSetListItem({
  set,
  index,
}: {
  set: StrengthPrescriptionSet;
  index: number;
}) {
  const volume = strengthSetVolumeLabel(set);
  const weight = strengthWeightSuffix(set);
  const watch = strengthSetWatchCompat(set);
  const media = resolveStrengthSetMedia({
    exercise: set.exercise,
    exerciseCatalogId: set.exerciseCatalogId,
  });

  return (
    <li className="flex items-start gap-3 text-sm">
      <StrengthSetLeadingVisual index={index} media={media} set={set} />
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
        <p className={strengthWatchClassName(watch.status)}>{watch.label}</p>
      </div>
    </li>
  );
}
