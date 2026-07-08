'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TwinTrustStrip({
  confidenceLabel,
  confidencePctRounded,
  confidenceHref,
  limitingFactorText,
  className,
}: {
  confidenceLabel: string | null;
  confidencePctRounded: number | null;
  confidenceHref: string | null;
  limitingFactorText: string | null;
  className?: string;
}) {
  const showConfidence = confidenceLabel != null;
  const showLimiting = limitingFactorText != null;

  if (!showConfidence && !showLimiting) return null;

  return (
    <div className={cn('space-y-1.5 text-xs leading-relaxed', className)}>
      {showConfidence ? (
        <p className="text-amber-700 dark:text-amber-400">
          {confidenceHref ? (
            <Link
              className="underline-offset-2 transition-colors hover:underline"
              href={confidenceHref}
            >
              {confidenceLabel}
              {confidencePctRounded != null ? ` (${confidencePctRounded} %)` : ''}
            </Link>
          ) : (
            <>
              {confidenceLabel}
              {confidencePctRounded != null ? ` (${confidencePctRounded} %)` : ''}
            </>
          )}
        </p>
      ) : null}

      {showLimiting ? (
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">Facteur limitant :</span>{' '}
          {limitingFactorText}
        </p>
      ) : null}
    </div>
  );
}
