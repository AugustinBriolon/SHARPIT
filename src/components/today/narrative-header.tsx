'use client';

import type { LimitingFactor, TopAction } from '@/hooks/use-today';
import { TwinTrustStrip } from '@/components/today/dashboard/twin-trust-strip';
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
  topAction: TopAction | null;
  computedAt: string;
  daySummary: TodayDaySummary;
  activities: ClientActivity[];
  adviceActionable: boolean;
  briefing?: string | null;
  briefingGeneratedAt?: string | null;
  confidence: number | null;
  confidenceLabel: string | null;
  limitingFactor: LimitingFactor | null;
  insufficientDataMessage: string | null;
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

function resolveEyebrow(
  briefing: string | null | undefined,
  phase: ReturnType<typeof resolveBriefingPhase>,
  adviceActionable: boolean,
  displayLabel: string,
): string {
  if (briefing) return BRIEFING_PHASE_EYEBROW[phase];
  if (adviceActionable) return displayLabel;
  return 'Bilan en attente';
}

function NarrativeBody({
  briefing,
  adviceActionable,
  rationale,
  insufficientDataMessage,
}: {
  briefing?: string | null;
  adviceActionable: boolean;
  rationale: string | null;
  insufficientDataMessage: string | null;
}) {
  if (briefing) {
    return <BriefingBody content={briefing} />;
  }
  if (adviceActionable && rationale) {
    return (
      <p className="font-heading text-foreground text-[1.65rem] leading-tight font-bold">
        {rationale}
      </p>
    );
  }
  return (
    <p className="text-foreground/90 text-sm leading-relaxed">
      {insufficientDataMessage ??
        'SHARPIT attend encore assez de données pour formuler un conseil d’entraînement fiable.'}
    </p>
  );
}

export function NarrativeHeader({
  verdict,
  topAction,
  computedAt,
  daySummary,
  activities,
  adviceActionable,
  briefing,
  briefingGeneratedAt,
  confidence,
  confidenceLabel,
  limitingFactor,
  insufficientDataMessage,
  className,
}: NarrativeHeaderProps) {
  const now = new Date();
  const effort = buildTodayEffortSnapshot(activities, now);
  const narrativeInput = {
    verdict,
    defaultRationale: topAction ? resolveCode(topAction.rationaleCode) : '',
    daySummary,
    now,
    effort,
  };

  const display = mapContextualNarrativeDisplay(verdict, narrativeInput);
  const rationale = topAction ? buildContextualTodayMessage(narrativeInput) : null;
  const freshnessLabel = briefingGeneratedAt
    ? buildNarrativeFreshnessNote(briefingGeneratedAt, daySummary, now)
    : buildNarrativeFreshnessNote(computedAt, daySummary, now);
  const referenceAt = briefingGeneratedAt ?? computedAt;
  const hoursAgo = Math.round((now.getTime() - new Date(referenceAt).getTime()) / (1000 * 60 * 60));
  const isStale = hoursAgo > 24;
  const phase = resolveBriefingPhase(now);

  const eyebrow = resolveEyebrow(briefing, phase, adviceActionable, display.label);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent px-6 py-7',
        adviceActionable
          ? display.bgClass
          : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-700/60',
        isStale && adviceActionable && 'opacity-80',
        className,
      )}
    >
      <div className="mb-3">
        <span
          className={cn(
            'text-xs font-semibold tracking-widest uppercase',
            adviceActionable ? display.colorClass : 'text-slate-500',
          )}
        >
          {eyebrow}
        </span>
      </div>

      <NarrativeBody
        adviceActionable={adviceActionable}
        briefing={briefing}
        insufficientDataMessage={insufficientDataMessage}
        rationale={rationale}
      />

      <TwinTrustStrip
        className="mt-4"
        confidence={confidence}
        confidenceLabel={confidenceLabel}
        limitingFactor={limitingFactor}
      />

      <p
        className={cn(
          'mt-3 text-xs',
          isStale ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}
      >
        {isStale ? '⚠ ' : ''}
        {freshnessLabel}
      </p>
    </div>
  );
}
