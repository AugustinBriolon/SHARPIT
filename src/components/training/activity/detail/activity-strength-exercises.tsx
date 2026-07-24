'use client';

import { useState } from 'react';
import { Dumbbell, Watch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { SPORT_IDENTITY_SURFACE, SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { resolveStrengthSetMedia, type ResolvedExerciseMedia } from '@/lib/exercises';
import { formatClockDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
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
  const [pushing, setPushing] = useState(false);

  async function sendToWatch() {
    if (pushing || sets.length === 0) return;
    setPushing(true);
    const loadingToast = toast.loading('Envoi vers Garmin…');
    try {
      const response = await fetch('/api/garmin/workouts/from-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id, schedule: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        workoutName?: string;
        mappedCount?: number;
        skipped?: Array<{ exercise: string }>;
        scheduledDate?: string | null;
      };
      if (!response.ok) {
        throw new Error(data.error || 'Envoi impossible');
      }
      const skipped = data.skipped?.length ?? 0;
      toast.success('Workout envoyé à Garmin', {
        description: [
          data.workoutName,
          data.scheduledDate ? `calendrier ${data.scheduledDate}` : null,
          skipped > 0 ? `${skipped} exercice(s) non mappé(s)` : null,
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
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <Dumbbell className={cn('size-4', sportText)} />
          Exercices
        </CardTitle>
        {sets.length > 0 ? (
          <Button
            disabled={pushing}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void sendToWatch()}
          >
            <Watch className="size-3.5" />
            {pushing ? 'Envoi…' : 'Envoyer à la montre'}
          </Button>
        ) : null}
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
              . Toucher une vignette pour l’animation. « Envoyer à la montre » crée un workout
              Garmin (bibliothèque + calendrier) — synchroniser la montre ensuite.
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
