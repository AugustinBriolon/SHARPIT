import type { ProductInsightBundle } from '@sharpit/core/product-insight/types';
import type { GlobalDecisionContext } from '@sharpit/server/presentation/global-decision-context';
import type { SleepNightStatus } from '@sharpit/server/presentation/sleep-view-model';
import type { SleepCoachView } from '@sharpit/server/lib/sleep/sleep';
import type { SleepScoreBreakdown } from '@sharpit/server/lib/sleep/sleep-scoring';

export type SleepBarPoint = { date: string; minutes: number | null; fill: string };

export type MetricTone = 'good' | 'warn' | 'bad' | 'neutral';

export type SleepPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  minDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  loading?: boolean;
  nightStatus?: SleepNightStatus;
  sleepScore: number | null;
  adequacyDisplay: { label: string; colorClass: string };
  scoreBreakdown: SleepScoreBreakdown;
  totalSleepMin: number | null;
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  bedtimeMin: number | null;
  wakeMin: number | null;
  garminScore: number | null;
  sleepDelta7d: number | null;
  targetDeltaMin: number | null;
  sleepTargetMin: number;
  coachView: SleepCoachView;
  barData: SleepBarPoint[];
  recoveryNote?: string | null;
  insights: ProductInsightBundle;
  globalDecision: GlobalDecisionContext;
  confidencePresentation: { pct: number | null };
};
