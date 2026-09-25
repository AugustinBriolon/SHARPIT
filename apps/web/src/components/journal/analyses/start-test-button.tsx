'use client';

import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Active test chip replacing the start CTA for the lever under test. */
export function RunningTestStatus({
  title,
  progressLabel,
}: {
  title: string;
  progressLabel: string;
}) {
  return (
    <p className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm text-pretty sm:min-h-8">
      <FlaskConical className="text-primary size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="text-foreground font-medium">En test</span>
        {' · '}
        {title}
        {' · '}
        <span className="text-data tabular-nums">{progressLabel}</span>
      </span>
    </p>
  );
}

/** Primary action of an association: start a 7-day test of that one lever. */
export function StartTestButton({
  pending,
  error,
  onStart,
}: {
  pending: boolean;
  error?: string | null;
  onStart: () => void;
}) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        className="min-h-11 sm:min-h-8"
        disabled={pending}
        size="sm"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStart();
        }}
      >
        <FlaskConical aria-hidden />
        {pending ? 'Lancement…' : 'Tester 7 jours'}
      </Button>
      {error ? (
        <span className="text-signal-caution text-xs text-pretty" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
