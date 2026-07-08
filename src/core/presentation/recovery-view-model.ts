import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { ProductInsightBundle } from '@/core/product-insight/types';
import type {
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationSection,
} from '@/core/presentation/types';

// Note: les pages drill-down conservent date/isToday/handlers côté client.
export type RecoveryViewModel = {
  readinessScore: number | null;
  signal: { label: string; qualityClass: string; arrow: string };
  limiterLabel: string | null;
  estimatedRecoveryDays: number | null;
  isCalibrating: boolean;
  availableDimCount: number;

  dimensions: NonNullable<AthleteSnapshot['recovery']>['dimensions'];
  intensityLabel: string;
  intensityClassName: string;
  rationale: string[];
  autonomicLabel: string;
  autonomicClass: string;
  wellnessLabel: string;
  wellnessClass: string;
  loadLabel: string;
  loadClass: string;
  dissonanceDetected: boolean;

  sparkHrv: { date: string; value: number | null }[];
  sparkRhr: { date: string; value: number | null }[];
  dualData: { date: string; a: number | null; b: number | null }[];
  baselineLow: number | null;
  baselineHigh: number | null;
  hrv: number | null;
  restingHr: number | null;
  bodyBattery: number | null;

  confidencePct: number;
  confidenceTone: 'good' | 'warn' | 'neutral' | 'bad';
  completenessLabel: string;
  overreaching?: { label: string; colorClass: string };
  illness?: { label: string; colorClass: string };
  keyEvidence: string[];

  insights: ProductInsightBundle;

  emptyState: PresentationEmptyState | null;
  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};
