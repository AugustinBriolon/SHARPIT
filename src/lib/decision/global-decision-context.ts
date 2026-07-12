import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import {
  EMPTY_GLOBAL_DECISION,
  type GlobalDecisionContext,
  type GlobalDecisionDomainRole,
} from '@/core/presentation/global-decision-context';
import { resolveCode } from '@/lib/french';
import { mapVerdictToDisplay } from '@/lib/today-mapping';
import { buildTopActionLine } from '@/lib/today-rich-view';
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
  if (!candidate) return false;
  return DOMAIN_MATCH[domain].includes(candidate);
}

function resolveDomainRole(
  snapshot: AthleteSnapshot,
  domain: DrillDownDomain,
): GlobalDecisionDomainRole {
  const { decision } = snapshot;
  if (!decision || !isAdviceActionableFromDecision(decision)) return 'none';

  const attention = decision.priority.attentionDomain;
  const limitingDomain = decision.limitingFactor.domain;
  const limitingSystem = decision.limitingFactor.system;

  if (
    matchesDomain(limitingDomain, domain) ||
    matchesDomain(attention, domain) ||
    (domain === 'SLEEP' && limitingSystem === 'RECOVERY') ||
    (domain === 'FATIGUE' && attention === 'FATIGUE')
  ) {
    return 'driving';
  }

  if (
    decision.supportingEvidence.some((evidence) => matchesDomain(evidence.domain, domain)) ||
    (domain === 'SLEEP' && attention === 'RECOVERY')
  ) {
    return 'contributing';
  }

  if (domain === 'BODY') return 'none';
  return 'contextual';
}

function relationNote(
  role: GlobalDecisionDomainRole,
  domain: DrillDownDomain,
  verdictLabel: string,
): string | null {
  switch (role) {
    case 'driving':
      if (domain === 'RECOVERY') return 'La récupération guide la décision produit du jour.';
      if (domain === 'FATIGUE')
        return 'La charge et la fatigue guident la décision produit du jour.';
      if (domain === 'ADAPTATION') return "L'adaptation guide la décision produit du jour.";
      if (domain === 'SLEEP')
        return 'Le sommeil contribue directement à la décision produit du jour.';
      if (domain === 'PHYSICAL_HEALTH') {
        return 'La santé physique guide la décision produit du jour.';
      }
      return 'Ce domaine guide la décision produit du jour.';
    case 'contributing':
      return 'Ce domaine contribue à la décision produit du jour.';
    case 'contextual':
      return `Décision produit du jour : ${verdictLabel}.`;
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
    relationNote: relationNote(domainRole, domain, display.label),
    todayHref: '/',
  };
}
