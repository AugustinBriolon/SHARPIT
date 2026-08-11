'use client';

import { useState } from 'react';
import type { ResolvedExerciseMedia } from '@/lib/exercises';
import { cn } from '@/lib/utils';

/**
 * Exercise movement visuals, shared by the realized activity detail and the
 * planned session read view. An athlete needs to see the movement *before*
 * doing the session, not only after it has been recorded — both surfaces
 * therefore render the same thumbnail, caption and attribution.
 */

const THUMB_CLASS =
  'border-analysis-border bg-muted/30 relative size-12 shrink-0 overflow-hidden rounded-lg border';

/** Tap-to-animate thumbnail: still frame by default, GIF while pressed on. */
export function ExerciseVisual({ media, label }: { media: ResolvedExerciseMedia; label: string }) {
  const [showGif, setShowGif] = useState(false);

  return (
    <button
      aria-label={`Voir le mouvement : ${label}`}
      aria-pressed={showGif}
      className={THUMB_CLASS}
      type="button"
      onClick={() => setShowGif((v) => !v)}
    >
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

/** Ordinal placeholder keeping the row rhythm when an exercise has no catalog media. */
export function ExerciseIndex({ index, className }: { index: number; className?: string }) {
  return (
    <span className={cn(THUMB_CLASS, 'grid place-items-center', className)} aria-hidden>
      <span className="font-mono text-xs font-semibold tabular-nums">{index}</span>
    </span>
  );
}

/** Muscle target and equipment, read off the resolved catalog entry. */
export function ExerciseMediaCaption({ media }: { media: ResolvedExerciseMedia }) {
  return (
    <span className="text-muted-foreground block text-xs font-normal wrap-break-word capitalize">
      {media.target}
      {media.equipment ? ` · ${media.equipment}` : ''}
    </span>
  );
}

/** Required Gym visual credit — render once per list that shows thumbnails. */
export function ExerciseMediaAttribution({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-0.5 pt-1 text-xs leading-relaxed">
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
      {children ? <> {children}</> : null}
    </p>
  );
}
