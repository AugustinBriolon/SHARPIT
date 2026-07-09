'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TwinTrustStrip({
  confidenceLabel,
  confidencePctRounded,
  confidenceHref,
  limitingFactorText,
  className,
  variant = 'default',
}: {
  confidenceLabel: string | null;
  confidencePctRounded: number | null;
  confidenceHref: string | null;
  limitingFactorText: string | null;
  className?: string;
  variant?: 'default' | 'subtle';
}) {
  const showConfidence = confidenceLabel != null;
  const showLimiting = limitingFactorText != null;

  if (!showConfidence && !showLimiting) return null;

  const confidenceClass = variant === 'subtle' ? 'text-muted-foreground' : 'text-signal-caution';

  return (
    <div
      className={cn(
        'analysis-panel rounded-analysis flex flex-wrap items-start justify-between gap-3 px-3 py-2.5 text-xs leading-relaxed',
        className,
      )}
    >
      {showConfidence ? (
        <p className={cn('min-w-0 flex-1', confidenceClass)}>
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
        <p className="text-foreground/80 min-w-0 flex-1">{limitingFactorText}</p>
      ) : null}
    </div>
  );
}
