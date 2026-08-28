'use client';

import Link from 'next/link';

function formatShortDate(value: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function GoalProgressTrack({
  progress,
  remaining,
}: {
  progress: number;
  remaining: string | null;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="space-y-1.5">
      <div
        aria-label="Progression vers la cible"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} %${remaining ? ` · ${remaining}` : ''}`}
        className="bg-primary/15 h-1 w-full overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span className="text-primary font-medium">{clamped} %</span>
        {remaining ? <span>{remaining}</span> : null}
      </div>
    </div>
  );
}

export function AchievedStatus({
  lastAchievedAt,
  validatingActivityId,
  showValidatingLink,
}: {
  lastAchievedAt?: string | Date | null;
  validatingActivityId?: string | null;
  showValidatingLink?: boolean;
}) {
  return (
    <div className="border-primary space-y-1 border-l pl-3 text-xs">
      <p className="text-primary font-medium">
        Objectif atteint
        {lastAchievedAt ? (
          <span className="text-muted-foreground font-normal">
            {' '}
            · {formatShortDate(lastAchievedAt)}
          </span>
        ) : null}
      </p>
      {showValidatingLink && validatingActivityId ? (
        <Link
          className="text-primary font-medium hover:underline"
          href={`/training/${validatingActivityId}`}
        >
          Voir la séance validante →
        </Link>
      ) : null}
    </div>
  );
}
