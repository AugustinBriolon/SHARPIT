'use client';

import type { TopAction } from '@/hooks/use-today';
import { resolveCode } from '@/lib/french';
import type { TodayDaySummary } from '@/lib/today-day-summary';
import type { ClientActivity } from '@/lib/query/types';
import {
  buildContextualTodayMessage,
  buildNarrativeFreshnessNote,
  buildTodayEffortSnapshot,
  mapContextualNarrativeDisplay,
} from '@/lib/today-narrative-context';
import type { OverallVerdict } from '@/lib/today-mapping';
import { BRIEFING_PHASE_EYEBROW, resolveBriefingPhase } from '@/lib/briefing-phase';
import { cn } from '@/lib/utils';

interface NarrativeHeaderProps {
  verdict: OverallVerdict;
  topAction: TopAction;
  computedAt: string;
  daySummary: TodayDaySummary;
  activities: ClientActivity[];
  briefing?: string | null;
  briefingGeneratedAt?: string | null;
  className?: string;
}

function BriefingBody({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-[1.05rem] leading-relaxed">
      {content.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        return (
          <p key={i} className="text-foreground/90 text-sm last:mb-0">
            {trimmed.replace(/\*\*/g, '')}
          </p>
        );
      })}
    </div>
  );
}

export function NarrativeHeader({
  verdict,
  topAction,
  computedAt,
  daySummary,
  activities,
  briefing,
  briefingGeneratedAt,
  className,
}: NarrativeHeaderProps) {
  const now = new Date();
  const effort = buildTodayEffortSnapshot(activities, now);
  const narrativeInput = {
    verdict,
    defaultRationale: resolveCode(topAction.rationaleCode),
    daySummary,
    now,
    effort,
  };

  const display = mapContextualNarrativeDisplay(verdict, narrativeInput);
  const rationale = buildContextualTodayMessage(narrativeInput);
  const freshnessLabel = briefingGeneratedAt
    ? buildNarrativeFreshnessNote(briefingGeneratedAt, daySummary, now)
    : buildNarrativeFreshnessNote(computedAt, daySummary, now);
  const referenceAt = briefingGeneratedAt ?? computedAt;
  const hoursAgo = Math.round((now.getTime() - new Date(referenceAt).getTime()) / (1000 * 60 * 60));
  const isStale = hoursAgo > 24;
  const phase = resolveBriefingPhase(now);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent px-6 py-7',
        display.bgClass,
        isStale && 'opacity-80',
        className,
      )}
    >
      <div className="mb-3">
        <span className={cn('text-xs font-semibold tracking-widest uppercase', display.colorClass)}>
          {briefing ? BRIEFING_PHASE_EYEBROW[phase] : display.label}
        </span>
      </div>

      {briefing ? (
        <BriefingBody content={briefing} />
      ) : (
        <p className="font-heading text-foreground text-[1.65rem] leading-tight font-bold">
          {rationale}
        </p>
      )}

      <p
        className={cn(
          'mt-4 text-xs',
          isStale ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}
      >
        {isStale ? '⚠ ' : ''}
        {freshnessLabel}
      </p>
    </div>
  );
}
