'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/confidence-bars';

/** Labels temporels courts — peuvent précéder l'action sur une même ligne. */
const TEMPORAL_CONTEXT_LABELS = new Set(['Ce soir', 'Après la séance', 'Jour de repos']);

function canMergeContextWithAction(eyebrow: string, action: string | null): action is string {
  if (!action) return false;
  if (eyebrow.includes('?')) return false;
  return TEMPORAL_CONTEXT_LABELS.has(eyebrow);
}

function formatLimiter(text: string | null): string | null {
  if (!text) return null;
  const cleaned = text.replace(/^limité par\s*/i, '').trim();
  if (!cleaned) return null;
  return `Limité par · ${cleaned}`;
}

/**
 * Morning Instrument plate — first viewport answers one question:
 * what should I do with my state today?
 * Semantic tint + accent communicate emotional state without guilt.
 */
export function TodayVerdictHero({ vm }: { vm: TodayViewModel }) {
  const { hero } = vm;
  const trust = hero.twinTrustStrip;
  const style = hero.verdictStyle;
  const useVerdictAccent = style.showVerdictColors;

  const priority = hero.focusPriority ?? hero.actionLine;
  const contextLabel = [hero.postureLabel, hero.eyebrow].filter(Boolean).join(' · ') || 'Ce matin';
  const secondaryLine = priority ?? hero.subline ?? null;
  const secondaryMuted = !priority && Boolean(hero.subline);
  const mergeContextWithAction = canMergeContextWithAction(hero.eyebrow, secondaryLine);
  const bars = confidenceBarsFromPct(trust.confidencePctRounded);

  let actionContent: ReactNode = null;
  if (mergeContextWithAction) {
    actionContent = (
      <p className="text-foreground max-w-2xl text-sm leading-relaxed font-medium">
        {secondaryLine}
      </p>
    );
  } else if (secondaryLine) {
    actionContent = (
      <p
        className={cn(
          'max-w-2xl text-sm leading-relaxed',
          secondaryMuted ? 'text-muted-foreground' : 'text-foreground font-medium',
        )}
      >
        {secondaryLine}
      </p>
    );
  }

  const confidenceInner = (
    <>
      <ConfidenceBars filled={bars} />
      <span className="text-[11px] font-medium tracking-wide uppercase">
        {trust.confidenceLabel}
      </span>
    </>
  );

  const confidenceTitle =
    trust.confidencePctRounded != null
      ? `${trust.confidenceLabel} (${trust.confidencePctRounded} %)`
      : (trust.confidenceLabel ?? undefined);

  let confidenceNode: ReactNode = null;
  if (trust.confidenceLabel != null) {
    if (trust.confidenceHref) {
      confidenceNode = (
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
          href={trust.confidenceHref}
          title={confidenceTitle}
        >
          {confidenceInner}
        </Link>
      );
    } else {
      confidenceNode = (
        <div className="text-muted-foreground inline-flex items-center gap-2">
          {confidenceInner}
        </div>
      );
    }
  }

  return (
    <section
      className={cn(
        'analysis-panel rounded-analysis-lg relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        useVerdictAccent && style.bgClass,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label inline-flex items-center gap-2">
          {useVerdictAccent && (
            <span
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                'motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200',
                style.dotClass,
              )}
              aria-hidden
            />
          )}
          {contextLabel}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {confidenceNode}
          {hero.goalLine && (
            <Badge
              className="border-analysis-border bg-background/70 rounded-full text-xs font-normal"
              variant="outline"
            >
              {hero.goalLine}
            </Badge>
          )}
        </div>
      </div>

      <h1
        className={cn(
          'text-verdict mt-6 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
          useVerdictAccent ? style.colorClass : 'text-foreground',
        )}
      >
        {hero.headline}
      </h1>

      {actionContent && <div className="mt-5">{actionContent}</div>}
    </section>
  );
}
