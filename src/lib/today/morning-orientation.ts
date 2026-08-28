/**
 * Morning orientation on Today — presentation states A / B / C.
 * Evidence pending → Orientation ready → Post-choice (on session, not hero).
 */

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { FreshnessLevel } from '@/core/athlete-state/freshness';
import { isForwardAdvicePhase } from '@/lib/daily-phase/resolve';
import type { DailyPhase } from '@/lib/daily-phase/types';
import { morningIntensityLabel } from '@/lib/morning-recalibration/sport-intensity-labels';
import type { ActivityType } from '@prisma/client';

export type MorningOrientationPhase = 'EVIDENCE_PENDING' | 'ORIENTATION_READY' | 'POST_CHOICE';

export type MorningRecalibrationStatus =
  'PRESENTED' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED' | 'EXPIRED';

/** One side of the morning session comparison (plan vs proposed). */
export type MorningSessionSide = {
  intensityLabel: string | null;
  durationMin: number | null;
  load: number | null;
  description: string | null;
};

export type MorningRecalibrationInput = {
  decisionId: string;
  sessionId: string;
  sessionType: string;
  direction: 'DOWN' | 'UP';
  changeSummary: string;
  why: string;
  status: MorningRecalibrationStatus;
  fromIntensity: string | null;
  toIntensity: string | null;
  fromDurationMin: number | null;
  toDurationMin: number | null;
  fromLoad: number | null;
  toLoad: number | null;
  fromDescription: string | null;
  toDescription: string | null;
};

export type MorningConfirmProposal = {
  decisionId: string;
  sessionId: string;
  changeSummary: string;
  why: string;
  current: MorningSessionSide;
  proposed: MorningSessionSide;
};

export type MorningSessionChoice = 'HOLD' | 'EASING_CONFIRMED' | 'INCREASE_CONFIRMED';

export type MorningOrientationResolved = {
  phase: MorningOrientationPhase;
  /** One-line night-evidence status (state A). */
  evidenceLine: string | null;
  showRefreshEvidence: boolean;
  showFirmActions: boolean;
  hideHeroConfidence: boolean;
  /**
   * Hero overrides — only for EVIDENCE_PENDING.
   * Post-choice never rewrites the day verdict (athlete already owns the action).
   */
  heroHeadline: string | null;
  heroSubline: string | null;
  /** Confirm DOWN (ease) when presented. */
  confirmEase: MorningConfirmProposal | null;
  /** Confirm UP (increase) when presented. */
  confirmIncrease: MorningConfirmProposal | null;
  holdDecisionId: string | null;
  /** Mark the planned session chip — never a separate card / hero rewrite. */
  sessionChoice: {
    sessionId: string;
    kind: MorningSessionChoice;
    /** Short chip label, e.g. "Allègement confirmé" / "Hausse confirmée" / "Tenue". */
    label: string;
  } | null;
};

const BLOCKING_EVIDENCE: ReadonlySet<FreshnessLevel> = new Set([
  'awaiting_data',
  'syncing',
  'computing',
  'stale',
]);

function domainFreshness(
  snapshot: AthleteSnapshot,
  domain: 'sleep' | 'recovery',
): FreshnessLevel | null {
  return snapshot.freshness.domains.find((d) => d.domain === domain)?.freshness ?? null;
}

/** Night proofs ready enough for a firm morning orientation. */
export function nightEvidenceReady(snapshot: AthleteSnapshot): boolean {
  const garmin = snapshot.freshness.providers.find((p) => p.provider === 'garmin');
  if (garmin?.connected && garmin.syncing) {
    return false;
  }

  for (const domain of ['sleep', 'recovery'] as const) {
    const level = domainFreshness(snapshot, domain);
    if ((level !== undefined && level !== null) && BLOCKING_EVIDENCE.has(level)) {
      return false;
    }
  }

  return true;
}

export function nightEvidenceLine(snapshot: AthleteSnapshot): string {
  const sleepMsg = snapshot.domainMessages.sleep ?? null;
  const recoveryMsg = snapshot.domainMessages.recovery ?? null;
  const primary = snapshot.freshness.primaryProductMessage;
  return (
    sleepMsg ??
    recoveryMsg ??
    primary ??
    'Les preuves de la nuit ne sont pas encore prêtes — actualise ou attends un instant.'
  );
}

export function sessionChoiceLabel(kind: MorningSessionChoice): string {
  switch (kind) {
    case 'EASING_CONFIRMED':
      return 'Allègement confirmé';
    case 'INCREASE_CONFIRMED':
      return 'Hausse confirmée';
    case 'HOLD':
      return 'Séance tenue';
  }
}

export function acceptedChoiceKind(direction: 'DOWN' | 'UP'): MorningSessionChoice {
  return direction === 'DOWN' ? 'EASING_CONFIRMED' : 'INCREASE_CONFIRMED';
}

type SessionSideInput = {
  sessionType: string;
  intensity: string | null;
  durationMin: number | null;
  load: number | null;
  description: string | null;
};

function sessionSide(input: SessionSideInput): MorningSessionSide {
  return {
    intensityLabel: morningIntensityLabel(input.sessionType as ActivityType, input.intensity),
    durationMin: input.durationMin,
    load: (input.load !== undefined && input.load !== null) ? Math.round(input.load) : null,
    description: input.description?.trim() || null,
  };
}

function confirmProposalFrom(recalibration: MorningRecalibrationInput): MorningConfirmProposal {
  return {
    decisionId: recalibration.decisionId,
    sessionId: recalibration.sessionId,
    changeSummary: recalibration.changeSummary,
    why: recalibration.why,
    current: sessionSide({
      sessionType: recalibration.sessionType,
      intensity: recalibration.fromIntensity,
      durationMin: recalibration.fromDurationMin,
      load: recalibration.fromLoad,
      description: recalibration.fromDescription,
    }),
    proposed: sessionSide({
      sessionType: recalibration.sessionType,
      intensity: recalibration.toIntensity,
      durationMin: recalibration.toDurationMin,
      load: recalibration.toLoad,
      description: recalibration.toDescription,
    }),
  };
}

function buildPostChoiceBase(): Omit<MorningOrientationResolved, 'sessionChoice'> {
  return {
    phase: 'POST_CHOICE',
    evidenceLine: null,
    showRefreshEvidence: false,
    showFirmActions: false,
    hideHeroConfidence: true,
    heroHeadline: null,
    heroSubline: null,
    confirmEase: null,
    confirmIncrease: null,
    holdDecisionId: null,
  };
}

function resolveAcceptedOrientation(
  recalibration: MorningRecalibrationInput,
): MorningOrientationResolved {
  const kind = acceptedChoiceKind(recalibration.direction);
  return {
    ...buildPostChoiceBase(),
    sessionChoice: {
      sessionId: recalibration.sessionId,
      kind,
      label: sessionChoiceLabel(kind),
    },
  };
}

function resolveHoldOrientation(input: {
  recalibration: MorningRecalibrationInput | null;
  clientHoldSessionId?: string | null;
}): MorningOrientationResolved {
  const sessionId = input.recalibration?.sessionId ?? input.clientHoldSessionId ?? '';
  return {
    ...buildPostChoiceBase(),
    sessionChoice: sessionId
      ? {
          sessionId,
          kind: 'HOLD',
          label: sessionChoiceLabel('HOLD'),
        }
      : null,
  };
}

function resolveEvidencePendingOrientation(snapshot: AthleteSnapshot): MorningOrientationResolved {
  return {
    phase: 'EVIDENCE_PENDING',
    evidenceLine: nightEvidenceLine(snapshot),
    showRefreshEvidence: true,
    showFirmActions: false,
    hideHeroConfidence: false,
    heroHeadline: null,
    heroSubline: null,
    confirmEase: null,
    confirmIncrease: null,
    holdDecisionId: null,
    sessionChoice: null,
  };
}

function confirmProposalIfPresented(
  recalibration: MorningRecalibrationInput | null,
  direction: 'DOWN' | 'UP',
): MorningConfirmProposal | null {
  if (recalibration?.status !== 'PRESENTED' || recalibration.direction !== direction) {
    return null;
  }
  return confirmProposalFrom(recalibration);
}

function resolveOrientationReady(
  recalibration: MorningRecalibrationInput | null,
): MorningOrientationResolved {
  const confirmEase = confirmProposalIfPresented(recalibration, 'DOWN');
  const confirmIncrease = confirmProposalIfPresented(recalibration, 'UP');
  const holdDecisionId = recalibration?.status === 'PRESENTED' ? recalibration.decisionId : null;

  return {
    phase: 'ORIENTATION_READY',
    evidenceLine: null,
    showRefreshEvidence: false,
    showFirmActions: (confirmEase !== undefined && confirmEase !== null) || (confirmIncrease !== undefined && confirmIncrease !== null),
    hideHeroConfidence: false,
    heroHeadline: null,
    heroSubline: null,
    confirmEase,
    confirmIncrease,
    holdDecisionId,
    sessionChoice: null,
  };
}

/**
 * Resolve morning Today state. Outside forward-advice phases → null (no morning flow).
 */
export function resolveMorningOrientation(input: {
  phase: DailyPhase;
  snapshot: AthleteSnapshot;
  recalibration: MorningRecalibrationInput | null;
  /** Client-only hold when no recalibration proposal existed. */
  clientHold?: boolean;
  /** Session id for client-only hold annotation. */
  clientHoldSessionId?: string | null;
}): MorningOrientationResolved | null {
  if (!isForwardAdvicePhase(input.phase)) {
    return null;
  }

  const { snapshot, recalibration, clientHold, clientHoldSessionId } = input;

  if (recalibration?.status === 'ACCEPTED') {
    return resolveAcceptedOrientation(recalibration);
  }
  if (recalibration?.status === 'REJECTED' || clientHold) {
    return resolveHoldOrientation({ recalibration, clientHoldSessionId });
  }
  if (!nightEvidenceReady(snapshot)) {
    return resolveEvidencePendingOrientation(snapshot);
  }
  return resolveOrientationReady(recalibration);
}
