import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import {
  EMPTY_GLOBAL_DECISION,
  type GlobalDecisionContext,
  type GlobalDecisionDomainRole,
} from '@/core/presentation/global-decision-context';
import { resolveCode } from '@/lib/french';
import { mapVerdictToDisplay } from '@/lib/today/today-mapping';
import { buildTopActionLine } from '@/lib/today/today-rich-view';
import {
  decisionTopAction,
  decisionVerdict,
  isAdviceActionableFromDecision,
} from '@/lib/decision/projection';

export type DrillDownDomain =
  'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | 'SLEEP' | 'PHYSICAL_HEALTH' | 'BODY';

const DOMAIN_MATCH: Record<DrillDownDomain, readonly string[]> = {
  RECOVERY: ['RECOVERY'],
  FATIGUE: ['FATIGUE', 'DAILY_STRAIN'],
  ADAPTATION: ['ADAPTATION'],
  SLEEP: ['RECOVERY'],
  PHYSICAL_HEALTH: ['PHYSICAL_HEALTH'],
  BODY: [],
};

function matchesDomain(candidate: string | null | undefined, domain: DrillDownDomain): boolean {
  if (!candidate) {
    return false;
  }
  return DOMAIN_MATCH[domain].includes(candidate);
}

function isDrivingDomain(snapshot: AthleteSnapshot, domain: DrillDownDomain): boolean {
  const { decision } = snapshot;
  if (!decision) {
    return false;
  }
  const attention = decision.priority.attentionDomain;
  const limitingDomain = decision.limitingFactor.domain;
  const limitingSystem = decision.limitingFactor.system;

  return (
    matchesDomain(limitingDomain, domain) ||
    matchesDomain(attention, domain) ||
    (domain === 'SLEEP' && limitingSystem === 'RECOVERY') ||
    (domain === 'FATIGUE' && attention === 'FATIGUE')
  );
}

function isContributingDomain(snapshot: AthleteSnapshot, domain: DrillDownDomain): boolean {
  const { decision } = snapshot;
  if (!decision) {
    return false;
  }
  const attention = decision.priority.attentionDomain;
  return (
    decision.supportingEvidence.some((evidence) => matchesDomain(evidence.domain, domain)) ||
    (domain === 'SLEEP' && attention === 'RECOVERY')
  );
}

function resolveDomainRole(
  snapshot: AthleteSnapshot,
  domain: DrillDownDomain,
): GlobalDecisionDomainRole {
  const { decision } = snapshot;
  if (!decision || !isAdviceActionableFromDecision(decision)) {
    return 'none';
  }

  if (isDrivingDomain(snapshot, domain)) {
    return 'driving';
  }
  if (isContributingDomain(snapshot, domain)) {
    return 'contributing';
  }
  if (domain === 'BODY') {
    return 'none';
  }
  return 'contextual';
}

const DRIVING_RELATION_NOTES: Partial<Record<DrillDownDomain, string>> = {
  RECOVERY: 'Ce domaine pilote la décision du jour.',
  FATIGUE: 'Charge et fatigue pilotent la décision du jour.',
  ADAPTATION: "L'adaptation pilote la décision du jour.",
  SLEEP: 'Le sommeil pèse directement dans la décision du jour.',
  PHYSICAL_HEALTH: 'La santé physique pilote la décision du jour.',
};

function relationNote(role: GlobalDecisionDomainRole, domain: DrillDownDomain): string | null {
  // Never echo the verdict label — the strip already shows it once.
  switch (role) {
    case 'driving':
      return DRIVING_RELATION_NOTES[domain] ?? 'Ce domaine pilote la décision du jour.';
    case 'contributing':
      return 'Ce domaine contribue à la décision — il ne la pilote pas seul.';
    case 'contextual':
      return 'Lecture contextuelle : la décision du jour est pilotée par un autre domaine.';
    default:
      return null;
  }
}

export function buildGlobalDecisionContext(
  snapshot: AthleteSnapshot,
  domain: DrillDownDomain,
): GlobalDecisionContext {
  const { decision } = snapshot;
  if (!decision || !isAdviceActionableFromDecision(decision)) {
    return { ...EMPTY_GLOBAL_DECISION };
  }

  const verdict = decisionVerdict(decision);
  const display = mapVerdictToDisplay(verdict);
  const domainRole = resolveDomainRole(snapshot, domain);
  if (domainRole === 'none') {
    return { ...EMPTY_GLOBAL_DECISION };
  }

  const { headlineCode } = decision.primaryDecision;
  const headline = headlineCode ? resolveCode(headlineCode) : null;

  return {
    visible: true,
    verdictLabel: display.label,
    verdictClassName: display.colorClass,
    headline: headline && headline !== headlineCode ? headline : null,
    topActionLine: buildTopActionLine(decisionTopAction(decision)),
    domainRole,
    relationNote: relationNote(domainRole, domain),
    todayHref: '/',
  };
}
