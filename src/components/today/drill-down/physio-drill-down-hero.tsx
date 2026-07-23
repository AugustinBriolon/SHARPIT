'use client';

import type { ReactNode } from 'react';
import { TodayDateSelector } from '@/components/today/drill-down/date-selector';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/confidence-bars';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Physio drill-down plate — one dominant verdict.
 * Score/duration as a mono instrument line — no PhysioRail, no inset %, no chrome.
 * Mobile: iOS-native header rhythm — centered date, accessory confiance.
 */
/* Hallmark · designed-as-app · design-system: design.md · genre: instrument-editorial */
export function PhysioDrillDownHero({
  date,
  isToday = true,
  maxDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  eyebrow,
  headline,
  headlineClassName,
  subline,
  /** Kept for call-site compatibility; no longer drives a rail. */
  railValue: _railValue,
  railMax: _railMax = 100,
  railCaption: _railCaption,
  railMarkerLabel: _railMarkerLabel,
  quickReadLabel,
  quickReadValue,
  quickReadSuffix,
  quickReadCaption,
  confidencePct,
  badge: _badge,
  footer,
  loading = false,
}: {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  eyebrow?: string | null;
  headline: string;
  headlineClassName?: string;
  subline?: string | null;
  railValue: number | null;
  railMax?: number;
  railCaption?: string;
  railMarkerLabel?: string | null;
  quickReadLabel: string;
  quickReadValue: string;
  quickReadSuffix?: string | null;
  quickReadCaption?: string | null;
  confidencePct?: number | null;
  badge?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}) {
  const showDateNav =
    onDateChange != null && onPreviousDay != null && onNextDay != null && maxDate != null;
  const bars =
    !loading && confidencePct != null && Number.isFinite(confidencePct)
      ? confidenceBarsFromPct(confidencePct)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        {showDateNav ? (
          <TodayDateSelector
            date={date}
            isToday={isToday}
            maxDate={maxDate}
            onChange={onDateChange}
            onNextDay={onNextDay}
            onPreviousDay={onPreviousDay}
          />
        ) : (
          <p className="text-muted-foreground text-xs capitalize">
            {formatDate(date, 'EEEE d MMMM', { locale: fr })}
          </p>
        )}
        {!loading && subline ? (
          <p className="text-muted-foreground mt-1.5 text-center text-xs tabular-nums">{subline}</p>
        ) : (
          <Skeleton className="mt-1.5 h-4 w-21 rounded-full" />
        )}

        <div className="mt-2 flex items-center justify-center gap-2">
          <div
            className="text-muted-foreground inline-flex items-center gap-1.5"
            title={confidencePct != null ? `Confiance ${Math.round(confidencePct)} %` : 'Confiance'}
          >
            <ConfidenceBars filled={bars ?? 0} />
            <span className="text-label">Confiance</span>
          </div>
        </div>
      </div>

      <section
        aria-busy={loading || undefined}
        className={cn(
          'bg-accent text-foreground border-analysis-border/13 relative overflow-hidden border',
          'sm:rounded-analysis-lg rounded-[1.25rem] px-4 py-6 sm:px-8 sm:py-8',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label inline-flex items-center gap-2">
            <span className="bg-primary h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
            {eyebrow}
          </p>

          {loading ? (
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-12" />
          ) : (
            <span
              className="bg-highlight text-highlight-foreground text-data inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-sm font-semibold"
              title={quickReadLabel}
            >
              {quickReadValue}
              {quickReadSuffix ? (
                <span className="text-[10px] font-normal">{quickReadSuffix}</span>
              ) : null}
            </span>
          )}
        </div>

        {loading ? (
          <Skeleton
            className={cn('mt-4 h-9 w-[min(100%,18rem)] rounded-lg sm:h-10', !eyebrow && 'mt-6')}
          />
        ) : (
          <h1
            className={cn(
              'text-verdict mt-4 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
              !eyebrow && 'mt-6',
              headlineClassName ?? 'text-foreground',
            )}
          >
            {headline}
          </h1>
        )}

        {loading ? (
          <div className="border-primary mt-4 border-l-2 pl-3 sm:mt-5">
            <Skeleton className="h-4 w-[min(100%,16rem)] rounded-full" />
          </div>
        ) : (
          quickReadCaption && (
            <p className="border-primary text-foreground/85 mt-4 max-w-2xl border-l-2 pl-3 text-sm leading-relaxed sm:mt-5">
              {quickReadCaption}
            </p>
          )
        )}

        {footer && !loading ? (
          <div className="text-muted-foreground mt-3 text-xs leading-relaxed">{footer}</div>
        ) : null}
      </section>
    </div>
  );
}
