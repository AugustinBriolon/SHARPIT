'use client';

import type { ReactNode } from 'react';
import { TodayDateSelector } from '@/components/today/drill-down/date-selector';
import { PhysioRail } from '@/components/ui/physio-rail';
import { cn } from '@/lib/utils';
import { format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  railValue,
  railMax = 100,
  railCaption = 'récupération vers intensité haute',
  railMarkerLabel,
  quickReadLabel = 'lecture rapide',
  quickReadValue,
  quickReadSuffix,
  quickReadCaption,
  badge,
  footer,
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
  quickReadLabel?: string;
  quickReadValue: string;
  quickReadSuffix?: string | null;
  quickReadCaption?: string | null;
  badge?: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
}) {
  const showDateNav =
    onDateChange != null && onPreviousDay != null && onNextDay != null && maxDate != null;

  return (
    <section
      className={cn(
        'analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6 sm:py-6',
        panelClassName,
      )}
    >
      <div className="space-y-4">
        <div className="text-center">
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
            <p className="text-muted-foreground/80 mt-1 text-sm tabular-nums">{subline}</p>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_14rem] lg:items-start">
          <div className="space-y-3">
            {eyebrow ? <p className="text-label">{eyebrow}</p> : null}
            <h1 className={cn('text-verdict', headlineClassName ?? 'text-foreground')}>
              {headline}
            </h1>

            <div className="max-w-xl space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label">position du jour</p>
                <p className="text-muted-foreground text-[10px]">{railCaption}</p>
              </div>
              <PhysioRail
                markerLabel={railMarkerLabel ?? undefined}
                max={railMax}
                value={railValue}
              />
            </div>
          </div>

          <div className="analysis-panel rounded-analysis px-4 py-4">
            <p className="text-label">{quickReadLabel}</p>
            <p className="text-data text-foreground mt-2 text-3xl font-semibold">
              {quickReadValue}
              {quickReadSuffix ? (
                <span className="text-muted-foreground ml-1 text-sm">{quickReadSuffix}</span>
              ) : null}
            </p>
            {quickReadCaption ? (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {quickReadCaption}
              </p>
            ) : null}
            {badge ? <div className="mt-3">{badge}</div> : null}
          </div>
        </div>

        {footer ? (
          <div className="text-muted-foreground text-sm leading-relaxed">{footer}</div>
        ) : null}
      </div>
    </section>
  );
}
