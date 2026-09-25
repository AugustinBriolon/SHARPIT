/**
 * Decision Memory — lifecycle transitions.
 *
 * Pure validation functions. `CoachingDecision.status` covers only the
 * presentation lifecycle (PRESENTED → one terminal outcome); OVERRIDDEN is
 * an action recorded after the fact, not a further status transition — see
 * docs/adr/ADR-006-decision-memory-aggregate.md.
 */

import type { CoachingDecisionActionType, CoachingDecisionStatus } from './types';

const VALID_STATUS_TRANSITIONS: Record<CoachingDecisionStatus, readonly CoachingDecisionStatus[]> =
  {
    PRESENTED: ['ACCEPTED', 'MODIFIED', 'REJECTED', 'EXPIRED'],
    ACCEPTED: [],
    MODIFIED: [],
    REJECTED: [],
    EXPIRED: [],
  };

/** All terminal statuses are final — a decision's presentation lifecycle resolves exactly once. */
export function canTransitionDecisionStatus(
  from: CoachingDecisionStatus,
  to: CoachingDecisionStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminalDecisionStatus(status: CoachingDecisionStatus): boolean {
  return status !== 'PRESENTED';
}

/**
 * ACCEPTED/MODIFIED/REJECTED are the athlete's first response to a PRESENTED
 * recommendation. OVERRIDDEN only makes sense once a PlannedSession actually
 * exists to override (i.e. after ACCEPTED or MODIFIED).
 */
export function canRecordAction(
  decisionStatus: CoachingDecisionStatus,
  actionType: CoachingDecisionActionType,
): boolean {
  if (actionType === 'OVERRIDDEN') {
    return decisionStatus === 'ACCEPTED' || decisionStatus === 'MODIFIED';
  }
  // ACCEPTED | MODIFIED | REJECTED — first response, only valid from PRESENTED.
  return decisionStatus === 'PRESENTED';
}
