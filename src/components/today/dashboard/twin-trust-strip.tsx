'use client';

import Link from 'next/link';
import type { LimitingFactor, ReasoningData } from '@/hooks/use-today';
import { formatLimitingFactorMessage } from '@/lib/athlete-state/snapshot-truthfulness';
import { resolveConfidenceHref } from '@/lib/today-twin-navigation';
import { cn } from '@/lib/utils';

export function TwinTrustStrip({
  confidence,
  confidenceLabel,
  limitingFactor,
  reasoning,
  className,
}: {
  confidence: number | null;
  confidenceLabel: string | null;
  limitingFactor: LimitingFactor | null;
  reasoning?: ReasoningData | null;
  className?: string;
}) {
  const limitingText = limitingFactor ? formatLimitingFactorMessage(limitingFactor) : null;
  const showConfidence = confidenceLabel != null;
  const confidenceHref = resolveConfidenceHref(reasoning);

  if (!showConfidence && !limitingText) return null;

  return (
    <div className={cn('space-y-1.5 text-xs leading-relaxed', className)}>
      {showConfidence ? (
        <p className="text-amber-700 dark:text-amber-400">
          <Link
            className="underline-offset-2 transition-colors hover:underline"
            href={confidenceHref}
          >
            {confidenceLabel}
            {confidence != null ? ` (${Math.round(confidence * 100)} %)` : ''}
          </Link>
        </p>
      ) : null}
      {limitingText ? (
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">Facteur limitant :</span> {limitingText}
        </p>
      ) : null}
    </div>
  );
}
