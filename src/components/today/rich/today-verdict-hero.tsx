'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/confidence-bars';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Morning Instrument plate — first viewport answers one question:
 * what should I do with my state today?
 * Bande ink direction: Forest plate, Lime Pulse punctuation. The verdict's
 * semantic color lives in the copy, never in the plate background — RECOVER
 * gets the same band as PUSH.
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

  const priority = hero.focusPriority ?? hero.actionLine;
  const contextLabel = [hero.postureLabel, hero.eyebrow].filter(Boolean).join(' · ') || 'Ce matin';
  const secondaryLine = priority ?? hero.subline ?? null;
  const secondaryMuted = !priority && Boolean(hero.subline);
  const bars = confidenceBarsFromPct(loading ? null : trust.confidencePctRounded);

  let actionContent: ReactNode = null;
  if (loading) {
    actionContent = (
      <div
        className="border-highlight dark:border-ink-surface-foreground/80 h-5.75 max-w-2xl border-l-2 pl-3 text-sm leading-relaxed"
        aria-hidden
      >
        <Skeleton className="bg-ink-surface-foreground/20 h-5 w-[min(100%,18rem)] rounded-full" />
      </div>
    );
  } else if (secondaryLine) {
    actionContent = (
      <p
        className={cn(
          'border-highlight dark:border-ink-surface-foreground/80 max-w-2xl border-l-2 pl-3 text-sm leading-relaxed',
          secondaryMuted
            ? 'text-ink-surface-foreground/70'
            : 'text-ink-surface-foreground/80 font-medium',
        )}
      >
        {secondaryLine}
      </p>
    );
  }

  const confidenceInner = loading ? (
    <>
      <ConfidenceBars filled={0} tone="highlight" />
      <SkeletonDataValue
        className="bg-ink-surface-foreground/20"
        heightClassName="h-[11px]"
        widthClassName="w-44 sm:w-56"
      />
    </>
  ) : (
    <>
      <ConfidenceBars filled={bars} tone="highlight" />
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
      <div className="text-ink-surface-foreground/65 inline-flex items-center gap-2">
        {confidenceInner}
      </div>
    );
  } else if (trust.confidenceLabel != null) {
    if (trust.confidenceHref) {
      confidenceNode = (
        <Link
          className="text-ink-surface-foreground/65 hover:text-ink-surface-foreground inline-flex items-center gap-2 transition-colors"
          href={trust.confidenceHref}
          title={confidenceTitle}
        >
          {confidenceInner}
        </Link>
      );
    } else {
      confidenceNode = (
        <div
          className="text-ink-surface-foreground/65 inline-flex items-center gap-2"
          title={confidenceTitle}
        >
          {confidenceInner}
        </div>
      );
    }
  }

  return (
    <section
      aria-busy={loading || undefined}
      className={cn(
        'surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-ink-surface-foreground/65 inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <span
            className={cn(
              'bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full',
              'motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200',
            )}
            aria-hidden
          />
          {loading ? (
            <SkeletonDataValue
              className="bg-ink-surface-foreground/20"
              heightClassName="h-3"
              widthClassName="w-48 sm:w-64"
            />
          ) : (
            contextLabel
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {confidenceNode}
          {loading && !hero.goalLine ? (
            <Badge
              className="border-ink-surface-foreground/25 text-ink-surface-foreground/80 rounded-full bg-transparent text-xs font-normal"
              variant="outline"
              aria-hidden
            >
              <SkeletonDataValue
                className="bg-ink-surface-foreground/20"
                heightClassName="h-3"
                widthClassName="w-36"
              />
            </Badge>
          ) : (
            <Badge
              className="border-ink-surface-foreground/25 text-ink-surface-foreground/80 text-data rounded-full bg-transparent text-xs font-normal"
              variant="outline"
            >
              {hero.goalLine}
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div
          className="text-verdict text-ink-surface-foreground mt-6 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]"
          aria-hidden
        >
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-8 sm:h-10"
            widthClassName="w-[min(100%,20rem)]"
          />
        </div>
      ) : (
        <h1 className="text-verdict text-ink-surface-foreground mt-6 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]">
          {hero.headline}
        </h1>
      )}

      {actionContent ? <div className="mt-5">{actionContent}</div> : null}
    </section>
  );
}
