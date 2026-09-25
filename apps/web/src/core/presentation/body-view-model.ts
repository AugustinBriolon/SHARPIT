import type { ProductInsightBundle } from '@/core/product-insight/types';
import type { CorpsTone } from '@/lib/ui/metric-tone';
import type { PresentationEmptyState, PresentationHierarchy } from '@/core/presentation/types';
import type {
  CompositionMetricId,
  MetricInterpretation,
  MetricZone,
} from '@/lib/health/composition-metric-guides';

export type BodyTrendWindowId = '14d' | '30d' | '90d' | '1y' | 'all';

export type BodyTrendWindow = {
  id: BodyTrendWindowId;
  label: string;
  days: number | null;
};

export type BodyChartPoint = {
  date: string;
  label: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  visceralFat: number | null;
  waterPct: number | null;
};

export type BodyMetricCardVm = {
  /** Stable key for UI lists (can be a guide id or a synthetic id). */
  cardId: string;
  /** When present, the card can open the explainer modal for this metric guide. */
  guideId?: CompositionMetricId;
  label: string;
  valueDisplay: string;
  footer?: string;
  footerTone?: CorpsTone;
  footerHint?: string;
  tone: CorpsTone;
};

export type BodyMetricExplainerVm = {
  metricId: CompositionMetricId;
  guideTitle: string;
  guideSummary: string;
  guideExplanation: string;
  guideUnit: string;

  displayValue: string;
  interpretation: MetricInterpretation;

  hideScale: boolean;
  zones: MetricZone[];
  scaleMarkerPct: number | null;

  showProfileAgeHint: boolean;
  showAgeComparisonNote: boolean;
  chronologicalAgeYears: number | null;
};

export type BodyViewModel = {
  hasData: boolean;
  emptyState: PresentationEmptyState | null;

  trendWindows: BodyTrendWindow[];
  activeTrendWindowId: BodyTrendWindowId;

  hero: {
    latestWeightKg: number | null;
    latestWeightDisplay: string;
    measuredAtLabel: string | null;
    sourceLabel: string | null;
    weightDeltaDisplay: string | null;
    weightDeltaTone: CorpsTone | null;
    weightDeltaHint: string | null;
    heroMini: {
      bodyFatPct: {
        value: number | null;
        deltaDisplay: string | null;
        deltaTone: CorpsTone;
        deltaHint: string | null;
        tone: CorpsTone;
        guideId?: CompositionMetricId;
      };
      musclePct: {
        value: number | null;
        deltaDisplay: string | null;
        deltaTone: CorpsTone;
        deltaHint: string | null;
        tone: CorpsTone;
        guideId?: CompositionMetricId;
      };
      visceralFat: {
        value: number | null;
        deltaDisplay: string | null;
        deltaTone: CorpsTone;
        deltaHint: string | null;
        tone: CorpsTone;
        guideId?: CompositionMetricId;
      };
      waterPct: {
        value: number | null;
        deltaDisplay: string | null;
        deltaTone: CorpsTone;
        deltaHint: string | null;
        tone: CorpsTone;
        guideId?: CompositionMetricId;
      };
    };
  };

  context: {
    chronologicalAgeYears: number | null;
  };

  hasBodyScan: boolean;

  trajectoryCards: BodyMetricCardVm[];
  contextCards: BodyMetricCardVm[];
  healthScanCards: BodyMetricCardVm[];

  chartData: BodyChartPoint[];

  explainerByMetricId: Partial<Record<CompositionMetricId, BodyMetricExplainerVm>>;

  insights: ProductInsightBundle;

  hierarchy: PresentationHierarchy;
};

// Alias de nommage demandé (Presentation Layer naming).
export type BodyPresentationViewModel = BodyViewModel;
