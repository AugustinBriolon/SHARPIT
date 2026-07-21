'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/confidence-bars';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { Skeleton } from '@/components/ui/skeleton';

/** Labels temporels courts — peuvent précéder l'action sur une même ligne. */
const TEMPORAL_CONTEXT_LABELS = new Set(['Ce soir', 'Après la séance', 'Jour de repos']);

function canMergeContextWithAction(eyebrow: string, action: string | null): action is string {
  if (!action) return false;
  if (eyebrow.includes('?')) return false;
  return TEMPORAL_CONTEXT_LABELS.has(eyebrow);
}

/**
 * Morning Instrument plate — first viewport answers one question:
 * what should I do with my state today?
 * Loading keeps the same DOM tree as loaded; only text values skeleton.
 */
export function TodayVerdictHero({
  loading = false,
  vm,
}: {
  vm: TodayViewModel;
  loading?: boolean;
}) {
  const { hero } = vm;
  const trust = hero.twinTrustStrip;
  const style = hero.verdictStyle;
  const useVerdictAccent = !loading && style.showVerdictColors;

  const priority = hero.focusPriority ?? hero.actionLine;
  const contextLabel = [hero.postureLabel, hero.eyebrow].filter(Boolean).join(' · ') || 'Ce matin';
  const secondaryLine = priority ?? hero.subline ?? null;
  const secondaryMuted = !priority && Boolean(hero.subline);
  const mergeContextWithAction = !loading && canMergeContextWithAction(hero.eyebrow, secondaryLine);
  const bars = confidenceBarsFromPct(loading ? null : trust.confidencePctRounded);

  let panelToneClass: string | null = null;
  if (loading) panelToneClass = 'border-primary/25 bg-primary/12';
  else if (useVerdictAccent) panelToneClass = style.bgClass;

  let headlineToneClass = 'text-foreground';
  if (loading) headlineToneClass = 'text-primary';
  else if (useVerdictAccent) headlineToneClass = style.colorClass;

  let actionContent: ReactNode = null;
  if (loading) {
    actionContent = (
      <div className="max-w-2xl text-sm leading-relaxed" aria-hidden>
        <Skeleton className="h-5 w-[min(100%,18rem)] rounded-full" />
      </div>
    );
  } else if (mergeContextWithAction) {
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

  const confidenceInner = loading ? (
    <>
      <ConfidenceBars filled={0} />
      <SkeletonDataValue heightClassName="h-[11px]" widthClassName="w-44 sm:w-56" />
    </>
  ) : (
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
  if (loading) {
    confidenceNode = (
      <div className="text-muted-foreground inline-flex items-center gap-2">{confidenceInner}</div>
    );
  } else if (trust.confidenceLabel != null) {
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
      aria-busy={loading || undefined}
      className={cn(
        'analysis-panel rounded-analysis-lg relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        panelToneClass,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-label inline-flex min-w-0 items-center gap-2">
          {(useVerdictAccent || loading) && (
            <span
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                'motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200',
                loading ? 'bg-primary' : style.dotClass,
              )}
              aria-hidden
            />
          )}
          {loading ? (
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-48 sm:w-64" />
          ) : (
            contextLabel
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {confidenceNode}
          {loading ? (
            <Badge
              className="border-analysis-border bg-background/70 rounded-full text-xs font-normal"
              variant="outline"
              aria-hidden
            >
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-36" />
            </Badge>
          ) : null}
          {!loading && hero.goalLine ? (
            <Badge
              className="border-analysis-border bg-background/70 rounded-full text-xs font-normal"
              variant="outline"
            >
              {hero.goalLine}
            </Badge>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div
          className={cn(
            'text-verdict mt-6 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
            headlineToneClass,
          )}
          aria-hidden
        >
          <SkeletonDataValue heightClassName="h-8 sm:h-10" widthClassName="w-[min(100%,20rem)]" />
        </div>
      ) : (
        <h1
          className={cn(
            'text-verdict mt-6 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
            headlineToneClass,
          )}
        >
          {hero.headline}
        </h1>
      )}

      {actionContent ? <div className="mt-5">{actionContent}</div> : null}
    </section>
  );
}
