'use client';

import type { ReactNode } from 'react';
import { TodayDateSelector } from '@/components/today/drill-down/date-selector';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/confidence-bars';
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
}) {
  const showDateNav =
    onDateChange != null && onPreviousDay != null && onNextDay != null && maxDate != null;
  const bars =
    confidencePct != null && Number.isFinite(confidencePct)
      ? confidenceBarsFromPct(confidencePct)
      : null;

  return (
    <section
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
        {subline ? (
          <p className="text-muted-foreground mt-1.5 text-center text-xs tabular-nums">{subline}</p>
        ) : null}
        {bars != null || badge ? (
          <div className="mt-2 flex items-center justify-center gap-2">
            {bars != null ? (
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
            {badge}
          </div>
        ) : null}
      </div>

      {eyebrow ? <p className="text-label mt-5">{eyebrow}</p> : null}

      <h1
        className={cn(
          'text-verdict mt-4 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
          !eyebrow && 'mt-6',
          headlineClassName ?? 'text-foreground',
        )}
      >
        {headline}
      </h1>

      {quickReadCaption ? (
        <p className="text-foreground mt-4 max-w-2xl text-sm leading-relaxed font-medium sm:mt-5">
          {quickReadCaption}
        </p>
      ) : null}

      <p className="text-muted-foreground mt-6 text-xs tracking-wide sm:mt-8">
        <span className="text-label mr-2">{quickReadLabel}</span>
        <span className="text-data text-foreground text-sm tabular-nums">
          {quickReadValue}
          {quickReadSuffix ? (
            <span className="text-muted-foreground ml-0.5 text-xs font-normal">
              {quickReadSuffix}
            </span>
          ) : null}
        </span>
      </p>

      {footer ? (
        <div className="text-muted-foreground mt-3 text-xs leading-relaxed">{footer}</div>
      ) : null}
    </section>
  );
}
