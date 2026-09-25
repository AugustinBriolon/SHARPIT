import type {
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationSection,
} from '@/core/presentation/types';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';

export type PhysicalHealthConditionCard = {
  conditionId: string;
  label: string;
  bodyRegion: string;
  sideLabel: string | null;
  type: string;
  typeLabel: string;
  scope: 'LOCALIZED' | 'SYSTEMIC';
  severity: number;
  status: string;
  statusLabel: string;
  trend: string;
  trendLabel: string | null;
  functionalCapacity: string | null;
  functionalCapacityLabel: string | null;
  confidencePct: number;
  confidenceTone: 'good' | 'warn' | 'neutral' | 'bad';
  estimatedRecoveryDays: number | null;
  affectsTraining: boolean;
  isActive: boolean;
  observationCount: number;
  sparkline: Array<{ date: string; severity: number | null }>;
  timelinePreview: Array<{ at: string; label: string; kind: string }>;
  legacyPhysicalNoteId: string | null;
};

export type PhysicalHealthViewModel = {
  aggregate: {
    activeCount: number;
    resolvedCount: number;
    maxSeverity: number;
    aggregateTrainingCapacity: string;
    aggregateTrainingCapacityLabel: string;
    trainingBlocked: boolean;
    confidencePct: number;
    confidenceTone: 'good' | 'warn' | 'neutral' | 'bad';
    decisionVerdict: string;
    /** Domain-level verdict label — not the global product decision. */
    decisionLabel: string;
    primaryConditionLabel: string | null;
  };

  activeConditions: PhysicalHealthConditionCard[];
  resolvedConditions: PhysicalHealthConditionCard[];

  globalDecision: GlobalDecisionContext;

  medicalDisclaimer: string;
  emptyState: PresentationEmptyState | null;
  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};
