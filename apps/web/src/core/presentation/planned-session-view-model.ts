/**
 * Planned Session — presentation ViewModel contract.
 */

import type { PresentationEmptyState } from '@/core/presentation/types';
import type {
  PlannedSessionAdvisoryKind,
  PlannedSessionExposureSetting,
} from '@/core/planned-session/types';

export type PlannedSessionContextCard = {
  readonly visible: boolean;
  readonly needsLocationConfirmation: boolean;
  readonly conditionsHeadline: string | null;
  readonly conditionsDetail: string | null;
  readonly impactSummary: string | null;
  readonly confidenceLabel: string | null;
  readonly freshnessLabel: string | null;
  readonly advisories: readonly {
    kind: PlannedSessionAdvisoryKind;
    headline: string;
    rationale: string;
    confidenceLabel: string | null;
  }[];
  readonly preparation: readonly { label: string }[];
  readonly exposure: PlannedSessionExposureSetting;
  readonly locationLabel: string | null;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
  readonly emptyState: PresentationEmptyState | null;
};

export type PlannedSessionCompletionCard = {
  readonly visible: boolean;
  readonly headline: string | null;
  readonly detailLines: readonly string[];
  readonly plannedConditionsLabel: string | null;
  readonly observedConditionsLabel: string | null;
};

export type PlannedSessionViewModel = {
  readonly sessionId: string;
  readonly context: PlannedSessionContextCard;
  readonly completion: PlannedSessionCompletionCard | null;
};
