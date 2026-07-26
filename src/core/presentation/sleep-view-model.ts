import type { SleepCoachView } from '@/lib/sleep/sleep';
import type { SleepScoreBreakdown } from '@/lib/sleep/sleep-scoring';
import type { ProductInsightBundle } from '@/core/product-insight/types';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import type {
  PresentationConfidence,
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationSection,
} from '@/core/presentation/types';

export type SleepBarPoint = { date: string; minutes: number | null; fill: string };

/** Whether the training-day night has landed in health data. */
export type SleepNightStatus = 'present' | 'pending' | 'missing';

export type SleepViewModel = {
  /** present = night metrics for trainingDayId; pending = live day awaiting sync; missing = past day without data. */
  nightStatus: SleepNightStatus;
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

  recoveryNote: string | null;

  insights: ProductInsightBundle;

  globalDecision: GlobalDecisionContext;

  confidencePresentation: PresentationConfidence;
  emptyState: PresentationEmptyState | null;
  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};
