'use client';

import Link from 'next/link';
import { activityTypeLabels } from '@/lib/format';
import type { ActivityType } from '@prisma/client';
import {
  planningComplianceView,
  planningDoneAccessibleName,
  planningDoneMetrics,
  type PlanningDisplayMode,
} from '@/lib/plan/planning-day-display';
import { SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { cn } from '@/lib/utils';

/**
 * A settled day states its outcome in one line — done or missed — so the week
 * keeps its weight on what is still ahead (DESIGN_LANGUAGE, planning).
 */
/** Per-mode facts, so the component itself stays a plain render. */
function settledRowFacts(input: {
  mode: PlanningDisplayMode;
  analysis: unknown;
  durationSec?: number | null;
  distanceM?: number | null;
}) {
  const done = input.mode === 'done';
  return {
    compliance: done ? planningComplianceView(input.analysis) : null,
    metrics: done
      ? planningDoneMetrics({ durationSec: input.durationSec, distanceM: input.distanceM })
      : null,
    titleClass: input.mode === 'missed' ? 'text-muted-foreground' : 'text-foreground/90',
    surfaceClass: input.mode === 'missed' ? 'bg-transparent' : 'bg-muted/20',
  };
}

export function PlanningSettledRow({
  activityType,
  analysis,
  distanceM,
  durationSec,
  href,
  mode,
  title,
}: {
  activityType: ActivityType;
  /** Coach compliance analysis, when it has landed. */
  analysis?: unknown;
  distanceM?: number | null;
  durationSec?: number | null;
  /** Null for a missed session — there is nothing to open. */
  href: string | null;
  mode: PlanningDisplayMode;
  title: string;
}) {
  const { compliance, metrics, titleClass, surfaceClass } = settledRowFacts({
    mode,
    analysis,
    durationSec,
    distanceM,
  });
  const accessibleName = planningDoneAccessibleName({ title, mode, compliance });

  const content = (
    <>
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full bg-current',
          SPORT_IDENTITY_TEXT[activityType],
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className={titleClass}>{title}</span>
        <span className="text-muted-foreground ml-2 text-xs">
          {activityTypeLabels[activityType]}
        </span>
      </span>
      {metrics ? (
        <span className="text-data text-muted-foreground shrink-0 text-xs tabular-nums">
          {metrics}
        </span>
      ) : null}
      {compliance ? (
        <span className={cn('shrink-0 text-xs font-medium', compliance.colorClass)}>
          {compliance.label}
        </span>
      ) : null}
      {mode === 'missed' ? (
        <span className="text-muted-foreground shrink-0 text-xs">Non réalisée</span>
      ) : null}
    </>
  );

  const className = cn(
    'border-analysis-border/20 flex min-h-9 w-full items-center gap-2 rounded-lg border px-2.5 py-2',
    surfaceClass,
  );

  if (!href) {
    return (
      <div aria-label={accessibleName} className={className} role="group">
        {content}
      </div>
    );
  }

  return (
    <Link
      aria-label={accessibleName}
      className={cn(className, 'hover:border-primary/30 pressable-lg transition-colors')}
      href={href}
    >
      {content}
    </Link>
  );
}
