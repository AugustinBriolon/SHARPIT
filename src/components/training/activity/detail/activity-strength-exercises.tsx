'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SPORT_IDENTITY_SURFACE, SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { resolveStrengthSetMedia, type ResolvedExerciseMedia } from '@/lib/exercises';
import { formatClockDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Dumbbell } from 'lucide-react';
import type { ActivityDetail } from './types';

function formatStrengthSetDetail(set: ActivityDetail['strengthSets'][number]): string {
  if (set.durationSec && set.durationSec > 0 && !set.weightKg) {
    const perSet = formatClockDuration(set.durationSec);
    return set.sets > 1 ? `${set.sets} × ${perSet}` : perSet;
  }

  const base = `${set.sets}×${set.reps}`;
  return set.weightKg ? `${base} @ ${set.weightKg} kg` : base;
}

function ExerciseVisual({ media, label }: { media: ResolvedExerciseMedia; label: string }) {
  const [showGif, setShowGif] = useState(false);

  return (
    <button
      aria-label={`Voir le mouvement : ${label}`}
      aria-pressed={showGif}
      className="border-analysis-border bg-muted/30 relative size-12 shrink-0 overflow-hidden rounded-lg border"
      type="button"
      onClick={() => setShowGif((v) => !v)}
    >
      {}
      <img
        alt=""
        className="size-full object-cover"
        decoding="async"
        loading="lazy"
        src={showGif ? media.gifUrl : media.thumbUrl}
      />
    </button>
  );
}

export function ActivityStrengthExercises({ activity }: { activity: ActivityDetail }) {
  const sets = activity.strengthSets;
  const sportText = SPORT_IDENTITY_TEXT.STRENGTH;
  const sportSurface = SPORT_IDENTITY_SURFACE.STRENGTH;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <Dumbbell className={cn('size-4', sportText)} />
          Exercices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sets.length > 0 ? (
          <>
            {sets.map((set, i) => {
              const volume = set.sets * set.reps * (set.weightKg ?? 0);
              const media = resolveStrengthSetMedia(set);
              return (
                <div
                  key={set.id}
                  className="border-analysis-border rounded-analysis flex flex-wrap items-center gap-3 border px-4 py-3"
                >
                  {media ? (
                    <ExerciseVisual label={set.exercise} media={media} />
                  ) : (
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold',
                        sportSurface,
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 font-medium">
                    {set.exercise}
                    {media ? (
                      <span className="text-muted-foreground block truncate text-xs font-normal capitalize">
                        {media.target}
                        {media.equipment ? ` · ${media.equipment}` : ''}
                      </span>
                    ) : null}
                    {set.notes && (
                      <span className="text-muted-foreground block truncate text-xs font-normal">
                        {set.notes}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    {formatStrengthSetDetail(set)}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    {volume > 0 && <span className="font-mono">{Math.round(volume)} kg</span>}
                    {set.rpe != null && (
                      <span className="border-border rounded-full border px-2 py-0.5 font-mono">
                        RPE {set.rpe}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
            <p className="text-muted-foreground px-0.5 pt-1 text-[10px] leading-relaxed">
              Visuels © Gym visual —{' '}
              <a
                className="underline-offset-2 hover:underline"
                href="https://gymvisual.com/"
                rel="noreferrer"
                target="_blank"
              >
                gymvisual.com
              </a>
              . Toucher une vignette pour l’animation.
            </p>
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
