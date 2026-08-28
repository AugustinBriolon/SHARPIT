'use client';

import type { ReactNode } from 'react';
import { TodayDateSelector } from '@/components/today/drill-down/date-selector';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/instruments/confidence-bars';
import { quickReadBadge } from '@/components/today/drill-down/physio-drill-down-hero-helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

function PhysioDrillDownDateLine({
  date,
  isToday,
  maxDate,
  minDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
}: {
  date: Date;
  isToday: boolean;
  maxDate?: Date;
  minDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
}) {
  const showDateNav =
    onDateChange !== undefined &&
    onPreviousDay !== undefined &&
    onNextDay !== undefined &&
    maxDate !== undefined &&
    minDate !== undefined;

  if (showDateNav) {
    return (
      <TodayDateSelector
        date={date}
        isToday={isToday}
        maxDate={maxDate}
        minDate={minDate}
        onChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />
    );
  }

  return (
    <p className="text-muted-foreground text-xs capitalize">
      {formatDate(date, 'EEEE d MMMM', { locale: fr })}
    </p>
  );
}

function PhysioDrillDownConfidence({
  loading,
  confidencePct,
}: {
  loading: boolean;
  confidencePct?: number | null;
}) {
  const bars =
    !loading &&
    confidencePct !== undefined &&
    confidencePct !== null &&
    Number.isFinite(confidencePct)
      ? confidenceBarsFromPct(confidencePct)
      : null;

  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      <div
        className="text-muted-foreground inline-flex items-center gap-1.5"
        title={
          confidencePct !== undefined && confidencePct !== null
            ? `Confiance ${Math.round(confidencePct)} %`
            : 'Confiance'
        }
      >
        <ConfidenceBars filled={bars ?? 0} />
        <span className="text-label">Confiance</span>
      </div>
    </div>
  );
}

export function PhysioDrillDownDateHeader({
  date,
  isToday,
  maxDate,
  minDate,
  loading,
  subline,
  onDateChange,
  onPreviousDay,
  onNextDay,
  confidencePct,
}: {
  date: Date;
  isToday: boolean;
  maxDate?: Date;
  minDate?: Date;
  loading: boolean;
  subline?: string | null;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  confidencePct?: number | null;
}) {
  return (
    <div className="flex flex-col items-center">
      <PhysioDrillDownDateLine
        date={date}
        isToday={isToday}
        maxDate={maxDate}
        minDate={minDate}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />
      {!loading && subline ? (
        <p className="text-muted-foreground mt-1.5 text-center text-xs tabular-nums">{subline}</p>
      ) : null}
      {loading ? <Skeleton className="mt-1.5 h-4 w-21 rounded-full" /> : null}
      <PhysioDrillDownConfidence confidencePct={confidencePct} loading={loading} />
    </div>
  );
}

function PhysioDrillDownHeadline({
  loading,
  eyebrow,
  headline,
  headlineClassName,
}: {
  loading: boolean;
  eyebrow?: string | null;
  headline: string;
  headlineClassName?: string;
}) {
  if (loading) {
    return (
      <Skeleton
        className={cn('mt-4 h-9 w-[min(100%,18rem)] rounded-lg sm:h-10', !eyebrow && 'mt-6')}
      />
    );
  }

  return (
    <p
      className={cn(
        'text-verdict mt-4 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
        !eyebrow && 'mt-6',
        headlineClassName ?? 'text-foreground',
      )}
    >
      {headline}
    </p>
  );
}

function PhysioDrillDownCaption({
  loading,
  quickReadCaption,
}: {
  loading: boolean;
  quickReadCaption?: string | null;
}) {
  if (loading) {
    return (
      <div className="mt-4 sm:mt-5">
        <Skeleton className="h-4 w-[min(100%,16rem)] rounded-full" />
      </div>
    );
  }

  if (!quickReadCaption) {
    return null;
  }

  return (
    <p className="text-foreground/85 mt-4 max-w-2xl text-sm leading-relaxed sm:mt-5">
      {quickReadCaption}
    </p>
  );
}

export function PhysioDrillDownVerdictSection({
  loading,
  eyebrow,
  headline,
  headlineClassName,
  quickReadLabel,
  quickReadValue,
  quickReadSuffix,
  quickReadCaption,
  footer,
}: {
  loading: boolean;
  eyebrow?: string | null;
  headline: string;
  headlineClassName?: string;
  quickReadLabel?: string;
  quickReadValue?: string | null;
  quickReadSuffix?: string | null;
  quickReadCaption?: string | null;
  footer?: ReactNode;
}) {
  return (
    <section
      aria-busy={loading || undefined}
      className={cn(
        'bg-accent text-foreground border-analysis-border/13 relative overflow-hidden border',
        'sm:rounded-analysis-lg rounded-xl px-4 py-6 sm:px-8 sm:py-8',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label inline-flex items-center gap-2">
          <span className="bg-primary h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
          {eyebrow}
        </p>
        {quickReadBadge({ loading, quickReadValue, quickReadLabel, quickReadSuffix })}
      </div>

      <PhysioDrillDownHeadline
        eyebrow={eyebrow}
        headline={headline}
        headlineClassName={headlineClassName}
        loading={loading}
      />

      <PhysioDrillDownCaption loading={loading} quickReadCaption={quickReadCaption} />

      {footer && !loading ? (
        <div className="text-muted-foreground mt-3 text-xs leading-relaxed">{footer}</div>
      ) : null}
    </section>
  );
}
