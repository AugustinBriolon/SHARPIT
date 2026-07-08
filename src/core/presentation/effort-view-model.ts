import type { ProductInsightBundle } from '@/core/product-insight/types';
import type {
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationSection,
} from '@/core/presentation/types';
import type { DimensionResult } from '@/hooks/use-today';
import type { FatigueType, TrainingCapacity } from '@/lib/today-mapping';

export type EffortViewModel = {
  strainScore: number | null;
  dailyLoad: number;
  weeklyLoad: number;
  fatigueType: FatigueType | string;
  /** Label déjà résolu (côté serveur) pour éviter toute interprétation côté client. */
  fatigueTypeLabel: string | null;
  performancePercent: number | null;
  consecutiveDays: number;
  estimatedDaysToFresh: number | null;

  acwr: number;
  chronicWeeklyAvg: number | null;
  tsb: number | null;

  confidencePct: number;
  confidenceTone: 'good' | 'warn' | 'neutral' | 'bad';
  verdict: string;
  verdictClass: string;
  verdictKey: string;
  rationale: string[];
  trainingCapacity: TrainingCapacity;
  /** Daily Strain : libellé/couleurs déjà résolus côté serveur. */
  strainSubtitle: string;
  strainStatusLabel: string;
  strainStatusClassName: string;
  strainStrokeColor: string;
  dimensions: Record<string, DimensionResult>;
  missingDimCount: number;
  dominantDimension: string | null;
  primaryLimitingFactor: string | null;
  isLowFatigue: boolean;
  pmcSeries: { label: string; ctl: number; atl: number; tsb: number }[];
  weeklyTss: { week: string; tss: number }[];
  avgWeeklyTss: number;
  overreaching?: { label: string; colorClass: string };
  keyEvidence: string[];
  completenessLabel: string;
  availableDimCount: number;

  insights: ProductInsightBundle;

  emptyState: PresentationEmptyState | null;
  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};
