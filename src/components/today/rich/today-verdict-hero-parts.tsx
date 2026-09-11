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
          widthClassName="w-36 sm:w-44"
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
        className="text-verdict text-ink-surface-foreground mt-5 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]"
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
    <h1 className="text-verdict text-ink-surface-foreground mt-5 max-w-3xl text-[1.75rem] leading-[1.15] text-balance sm:text-[2.125rem]">
      {headline}
    </h1>
  );
}

export function TodayVerdictActionLine({
  loading,
  secondaryLine,
  secondaryMuted,
}: {
  loading: boolean;
  secondaryLine: string | null;
  secondaryMuted: boolean;
}) {
  if (loading) {
    return (
      <div className="h-5.75 max-w-2xl text-sm leading-relaxed" aria-hidden>
        <Skeleton className="bg-ink-surface-foreground/20 h-5 w-[min(100%,18rem)] rounded-full" />
      </div>
    );
  }
  if (!secondaryLine) {
    return null;
  }
  return (
    <p
      className={cn(
        'max-w-2xl text-sm leading-relaxed text-pretty',
        secondaryMuted
          ? 'text-ink-surface-foreground/70'
          : 'text-ink-surface-foreground/80 font-medium',
      )}
    >
      {secondaryLine}
    </p>
  );
}

/** Canonical plate frein — DESIGN_LANGUAGE §14. */
export function TodayVerdictLimiter({
  loading,
  cause,
  href,
}: {
  loading: boolean;
  cause: string | null;
  href: string | null;
}) {
  if (loading) {
    return (
      <div className="mt-3" aria-hidden>
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-3"
          widthClassName="w-52"
        />
      </div>
    );
  }
  if (!cause || !href) {
    return null;
  }

  return (
    <Link
      href={href}
      className={cn(
        'text-data text-ink-surface-foreground/55 hover:text-ink-surface-foreground/85',
        'mt-3 inline-flex max-w-2xl items-baseline gap-1.5 text-xs font-medium tracking-wide uppercase',
        'transition-[color,transform] duration-150 ease-out',
        'motion-safe:active:scale-[var(--press-scale-small)]',
      )}
    >
      <span>
        Limité par · {cause}
        <span className="ms-1" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}

function confidenceTitleFor(trust: {
  confidenceLabel: string | null;
  confidencePctRounded: number | null;
}): string | undefined {
  if (trust.confidencePctRounded !== null) {
    return `${trust.confidenceLabel} (${trust.confidencePctRounded} %)`;
  }
  return trust.confidenceLabel ?? undefined;
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
  const confidenceInner = <VerdictConfidenceInner bars={bars} loading={loading} trust={trust} />;

  if (loading) {
    return (
      <div className="text-ink-surface-foreground/50 mt-5 inline-flex items-center gap-2">
        {confidenceInner}
      </div>
    );
  }

  if (trust.confidenceLabel === null) {
    return null;
  }

  const title = confidenceTitleFor(trust);
  if (trust.confidenceHref) {
    return (
      <Link
        className="text-ink-surface-foreground/50 hover:text-ink-surface-foreground/75 mt-5 inline-flex items-center gap-2 transition-colors duration-150"
        href={trust.confidenceHref}
        title={title}
      >
        {confidenceInner}
      </Link>
    );
  }

  return (
    <div
      className="text-ink-surface-foreground/50 mt-5 inline-flex items-center gap-2"
      title={title}
    >
      {confidenceInner}
    </div>
  );
}

function VerdictConfidenceInner({
  loading,
  trust,
  bars,
}: {
  loading: boolean;
  trust: { confidenceLabel: string | null };
  bars: number;
}) {
  if (loading) {
    return (
      <>
        <ConfidenceBars filled={0} tone="highlight" />
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-[11px]"
          widthClassName="w-44 sm:w-56"
        />
      </>
    );
  }

  return (
    <>
      <ConfidenceBars filled={bars} tone="highlight" />
      <span className="text-data text-xs font-medium tracking-wide uppercase">
        {trust.confidenceLabel}
      </span>
    </>
  );
}
