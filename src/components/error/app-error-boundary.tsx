'use client';

import { catchError, type ErrorInfo } from 'next/error';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Recovery surface for a render that threw — the athlete keeps the app shell
 * and gets one honest action back.
 *
 * `retry()` re-fetches and re-renders the boundary's children, so it recovers
 * from a failed Server Component and not only from client state. Unlike a plain
 * React error boundary, this one lets `notFound()` and `redirect()` through:
 * both are thrown under the hood, and swallowing them would turn a missing
 * activity into a crash.
 *
 * It does not catch errors thrown in event handlers or async callbacks — those
 * stay the caller's responsibility (mutations surface through TanStack Query and
 * the toast layer).
 */
function AppErrorFallback({ title }: { title?: string }, { error, retry }: ErrorInfo) {
  const detail = error instanceof Error ? error.message : null;

  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col gap-2.5 border-dashed px-5 py-5">
      <TriangleAlert className="text-destructive size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {title ?? 'Cette section n’a pas pu se charger'}
        </p>
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed sm:text-[13px]">
          Rien n’est perdu — tes données sont intactes. Réessaie&nbsp;; si l’erreur persiste, elle
          vient du serveur et non de ton appareil.
        </p>
        {process.env.NODE_ENV === 'development' && detail ? (
          <p className="text-muted-foreground/80 font-mono text-xs break-words">{detail}</p>
        ) : null}
      </div>
      <div className="pt-0.5">
        <Button size="sm" variant="outline" onClick={() => retry()}>
          Réessayer
        </Button>
      </div>
    </div>
  );
}

export const AppErrorBoundary = catchError(AppErrorFallback);
