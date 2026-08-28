'use client';

import type { ReactNode } from 'react';
import {
  PhysioDrillDownDateHeader,
  PhysioDrillDownVerdictSection,
} from '@/components/today/drill-down/physio-drill-down-hero-parts';

/**
 * Physio drill-down plate — one dominant verdict.
 */
export function PhysioDrillDownHero({
  date,
  isToday = true,
  maxDate,
  minDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  eyebrow,
  headline,
  headlineClassName,
  subline,
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
  minDate?: Date;
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
  quickReadValue?: string | null;
  quickReadSuffix?: string | null;
  quickReadCaption?: string | null;
  confidencePct?: number | null;
  badge?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="space-y-4">
      <PhysioDrillDownDateHeader
        confidencePct={confidencePct}
        date={date}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        minDate={minDate}
        subline={subline}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />
      <PhysioDrillDownVerdictSection
        eyebrow={eyebrow}
        footer={footer}
        headline={headline}
        headlineClassName={headlineClassName}
        loading={loading}
        quickReadCaption={quickReadCaption}
        quickReadLabel={quickReadLabel}
        quickReadSuffix={quickReadSuffix}
        quickReadValue={quickReadValue}
      />
    </div>
  );
}
