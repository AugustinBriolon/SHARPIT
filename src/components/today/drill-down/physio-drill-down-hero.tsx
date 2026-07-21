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
  badge,
  footer,
  /** Soft plate tint — only when caller opts in (never auto from text colour). */
  panelClassName,
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
  panelClassName?: string;
  loading?: boolean;
}) {
  const showDateNav =
    onDateChange != null && onPreviousDay != null && onNextDay != null && maxDate != null;
  const bars =
    !loading && confidencePct != null && Number.isFinite(confidencePct)
      ? confidenceBarsFromPct(confidencePct)
      : null;

  return (
    <section
      aria-busy={loading || undefined}
      className={cn(
        'analysis-panel relative overflow-hidden',
        'sm:rounded-analysis-lg rounded-[1.25rem] px-4 py-6 sm:px-8 sm:py-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        panelClassName,
      )}
    >
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
        {loading ? null : subline ? (
          <p className="text-muted-foreground mt-1.5 text-center text-xs tabular-nums">{subline}</p>
        ) : null}
        {loading || bars != null || badge ? (
          <div className="mt-2 flex items-center justify-center gap-2">
            {loading ? (
              <div className="text-muted-foreground inline-flex items-center gap-1.5">
                <Skeleton className="h-2.5 w-6 rounded-sm" />
                <span className="text-label">Confiance</span>
              </div>
            ) : bars != null ? (
              <div
                className="text-muted-foreground inline-flex items-center gap-1.5"
                title={
                  confidencePct != null ? `Confiance ${Math.round(confidencePct)} %` : 'Confiance'
                }
              >
                <ConfidenceBars filled={bars} />
                <span className="text-label">Confiance</span>
              </div>
            ) : null}
            {!loading ? badge : null}
          </div>
        ) : null}
      </div>

      {eyebrow ? <p className="text-label mt-5">{eyebrow}</p> : null}

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
        <Skeleton className="mt-4 h-4 w-[min(100%,16rem)] rounded-full sm:mt-5" />
      ) : (
        quickReadCaption && (
          <p className="text-foreground mt-4 max-w-2xl text-sm leading-relaxed font-medium sm:mt-5">
            {quickReadCaption}
          </p>
        )
      )}

      <div className="text-muted-foreground mt-6 text-xs tracking-wide sm:mt-8">
        <span className="text-label mr-2">{quickReadLabel}</span>
        {loading ? (
          <SkeletonDataValue
            className="align-baseline"
            heightClassName="h-5"
            widthClassName="w-14"
          />
        ) : (
          <span className="text-data text-foreground text-sm tabular-nums">
            {quickReadValue}
            {quickReadSuffix ? (
              <span className="text-muted-foreground ml-0.5 text-xs font-normal">
                {quickReadSuffix}
              </span>
            ) : null}
          </span>
        )}
      </div>

      {footer && !loading ? (
        <div className="text-muted-foreground mt-3 text-xs leading-relaxed">{footer}</div>
      ) : null}
    </section>
  );
}
