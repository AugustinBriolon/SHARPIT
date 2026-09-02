'use client';

import Link from 'next/link';
import { ConfidenceBars } from '@/components/ui/instruments/confidence-bars';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';

export function TodayVerdictContextLabel({
  loading,
  contextLabel,
}: {
  loading: boolean;
  contextLabel: string;
}) {
  return (
    <div className="text-ink-surface-foreground/65 text-data inline-flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide uppercase">
      <span
        className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
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
  );
}

export function TodayVerdictHeadline({
  loading,
  headline,
}: {
  loading: boolean;
  headline: string;
}) {
  if (loading) {
    return (
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
    );
  }

  return (
    <h1 className="text-verdict text-ink-surface-foreground mt-6 max-w-3xl text-[1.75rem] leading-[1.15] text-balance sm:text-[2.125rem]">
      {headline}
    </h1>
  );
}

export function TodayVerdictActionLine({
  loading,
  secondaryLine,
  secondaryMuted,
  whyHref,
}: {
  loading: boolean;
  secondaryLine: string | null;
  secondaryMuted: boolean;
  /** Drill-down for « Pourquoi » — limiting factor when known. */
  whyHref?: string | null;
}) {
  if (loading) {
    return (
      <div className="h-5.75 max-w-2xl text-sm leading-relaxed" aria-hidden>
        <Skeleton className="bg-ink-surface-foreground/20 h-5 w-[min(100%,18rem)] rounded-full" />
      </div>
    );
  }
  if (!secondaryLine && !whyHref) {
    return null;
  }
  return (
    <div className="flex max-w-2xl flex-wrap items-baseline gap-x-3 gap-y-1">
      {secondaryLine ? (
        <p
          className={cn(
            'text-sm leading-relaxed text-pretty',
            secondaryMuted
              ? 'text-ink-surface-foreground/70'
              : 'text-ink-surface-foreground/80 font-medium',
          )}
        >
          {secondaryLine}
        </p>
      ) : null}
      {whyHref ? (
        <Link
          className="text-ink-surface-foreground/65 hover:text-ink-surface-foreground shrink-0 text-sm underline-offset-4 hover:underline"
          href={whyHref}
        >
          Pourquoi
        </Link>
      ) : null}
    </div>
  );
}

export function TodayVerdictConfidence({
  loading,
  trust,
  bars,
}: {
  loading: boolean;
  trust: {
    confidenceLabel: string | null;
    confidencePctRounded: number | null;
    confidenceHref: string | null;
  };
  bars: number;
}) {
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
      <span className="text-data text-xs font-medium tracking-wide uppercase">
        {trust.confidenceLabel}
      </span>
    </>
  );

  const confidenceTitle =
    trust.confidencePctRounded !== null
      ? `${trust.confidenceLabel} (${trust.confidencePctRounded} %)`
      : (trust.confidenceLabel ?? undefined);

  if (loading) {
    return (
      <div className="text-ink-surface-foreground/65 inline-flex items-center gap-2">
        {confidenceInner}
      </div>
    );
  }

  if (trust.confidenceLabel === null) {
    return null;
  }

  if (trust.confidenceHref) {
    return (
      <Link
        className="text-ink-surface-foreground/65 hover:text-ink-surface-foreground inline-flex items-center gap-2 transition-colors"
        href={trust.confidenceHref}
        title={confidenceTitle}
      >
        {confidenceInner}
      </Link>
    );
  }

  return (
    <div
      className="text-ink-surface-foreground/65 inline-flex items-center gap-2"
      title={confidenceTitle}
    >
      {confidenceInner}
    </div>
  );
}

export function TodayVerdictGoalBadge({
  loading,
  goalLine,
}: {
  loading: boolean;
  goalLine: string | null;
}) {
  if (loading && !goalLine) {
    return <BadgeSkeleton />;
  }
  if (!loading && goalLine) {
    return (
      <span className="border-ink-surface-foreground/25 text-ink-surface-foreground/80 text-data rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-normal">
        {goalLine}
      </span>
    );
  }
  return null;
}

function BadgeSkeleton() {
  return (
    <span
      className="border-ink-surface-foreground/25 text-ink-surface-foreground/80 rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-normal"
      aria-hidden
    >
      <SkeletonDataValue
        className="bg-ink-surface-foreground/20"
        heightClassName="h-3"
        widthClassName="w-36"
      />
    </span>
  );
}
