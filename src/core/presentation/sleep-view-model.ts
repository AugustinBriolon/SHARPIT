import type { SleepCoachView } from '@/lib/sleep';
import type { SleepScoreBreakdown } from '@/lib/sleep-scoring';
import type { ProductInsightBundle } from '@/core/product-insight/types';
import type {
  PresentationConfidence,
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationSection,
} from '@/core/presentation/types';

export type SleepBarPoint = { date: string; minutes: number | null; fill: string };

export type SleepViewModel = {
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

  confidencePresentation: PresentationConfidence;
  emptyState: PresentationEmptyState | null;
  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};
