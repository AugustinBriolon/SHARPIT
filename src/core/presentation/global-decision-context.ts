/**
 * Global product decision — projected from AthleteSnapshot.decision for drill-down surfaces.
 * Distinct from domain-level verdicts (recovery.decision, fatigue.decision, etc.).
 */
export type GlobalDecisionDomainRole = 'driving' | 'contributing' | 'contextual' | 'none';

export type GlobalDecisionContext = {
  visible: boolean;
  verdictLabel: string;
  verdictClassName: string;
  headline: string | null;
  topActionLine: string | null;
  domainRole: GlobalDecisionDomainRole;
  relationNote: string | null;
  todayHref: string;
};

export const EMPTY_GLOBAL_DECISION: GlobalDecisionContext = {
  visible: false,
  verdictLabel: '—',
  verdictClassName: 'text-muted-foreground',
  headline: null,
  topActionLine: null,
  domainRole: 'none',
  relationNote: null,
  todayHref: '/today',
};
