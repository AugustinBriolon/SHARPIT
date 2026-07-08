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

  const confidenceClass =
    variant === 'subtle' ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400';

  return (
    <div className={cn('text-muted-foreground text-xs leading-relaxed', className)}>
      {showConfidence ? (
        <p className={confidenceClass}>
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

      {showLimiting ? <p className="mt-1">{limitingFactorText}</p> : null}
    </div>
  );
}
