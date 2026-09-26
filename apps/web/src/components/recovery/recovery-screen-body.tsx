'use client';

import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { RecoveryPageView } from '@/components/recovery/recovery-page-view';
import type { RecoveryViewModel } from '@sharpit/app/presentation/recovery-view-model';

export function RecoveryScreenBody({
  backHref,
  backLabel,
  content,
  date,
  isToday,
  loading,
  maxDate,
  minDate,
  onDateChange,
  onNextDay,
  onPreviousDay,
}: {
  backHref?: string;
  backLabel?: string;
  content: RecoveryViewModel;
  date: Date;
  isToday: boolean;
  loading: boolean;
  maxDate: Date;
  /** Demo sessions only — undefined for a real athlete, and must stay undefined. */
  minDate?: Date;
  onDateChange: (date: Date) => void;
  onNextDay: () => void;
  onPreviousDay: () => void;
}) {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title="Récupération" />
      <RecoveryPageView
        date={date}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        minDate={minDate}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
        {...content}
      />
    </div>
  );
}
