/**
 * Planned Session — presentation mapping (product expression, not raw weather).
 */

import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import type {
  PlannedSessionContext,
  PlannedSessionCompletionComparison,
} from '@/core/planned-session/types';
import { needsExposureConfirmation } from '@/core/planned-session/defaults';
import type { PlannedSessionRecord } from '@/lib/planned-session/resolve-context';

const ADVISORY_HEADLINES: Record<string, string> = {
  'planned.advisory.confirmLocation.headline': 'Où se déroulera la séance ?',
  'planned.advisory.indoorProceed.headline': 'Séance en intérieur',
  'planned.advisory.noForecast.headline': 'Conditions indisponibles',
  'planned.advisory.reduceIntensity.headline': 'Réduire l’intensité prévue',
  'planned.advisory.shiftEarlier.headline': 'Envisager un créneau plus tôt',
  'planned.advisory.hydration.headline': 'Hydratation renforcée',
  'planned.advisory.indoorAlternative.headline': 'Alternative intérieur possible',
  'planned.advisory.recoveryDemand.headline': 'Récupération plus exigeante',
  'planned.advisory.proceed.headline': 'Conditions favorables',
  'planned.advisory.rainRisk.headline': 'Pluie probable sur le créneau',
  'planned.advisory.coldRisk.headline': 'Froid marqué attendu',
};

const ADVISORY_RATIONALES: Record<string, string> = {
  'planned.advisory.confirmLocation.rationale':
    'Pour les séances outdoor, SHARPIT a besoin de savoir si tu seras dehors et où, afin d’anticiper l’impact sur ta séance.',
  'planned.advisory.indoorProceed.rationale':
    'La météo extérieure n’influence pas l’interprétation physiologique de cette séance.',
  'planned.advisory.noForecast.rationale':
    'La prévision n’est pas disponible pour ce créneau. Tu peux confirmer le lieu ou ajuster après coup.',
  'planned.advisory.reduceIntensity.rationale':
    'Le stress thermique prévu est élevé pour une séance intense — vise la qualité plutôt que la charge.',
  'planned.advisory.shiftEarlier.rationale':
    'Les températures montent en journée. Un départ matinal limite le stress thermique.',
  'planned.advisory.hydration.rationale':
    'Chaleur ou humidité prévues — prévois plus de fluides avant et pendant la séance.',
  'planned.advisory.indoorAlternative.rationale':
    'L’environnement pèsera significativement sur la performance. Un home trainer reste une option.',
  'planned.advisory.recoveryDemand.rationale':
    'La séance demandera plus de récupération que prévu — garde de la marge les jours suivants.',
  'planned.advisory.proceed.rationale':
    'Les conditions attendues restent compatibles avec ton intention.',
  'planned.advisory.rainRisk.rationale':
    'Des précipitations sont attendues — prévois équipement adapté ou un plan B.',
  'planned.advisory.coldRisk.rationale':
    'Des températures basses sont attendues — échauffement et équipement hivernal recommandés.',
};

const PREP_LABELS: Record<string, (params?: Readonly<Record<string, string | number>>) => string> =
  {
    'planned.prep.hydration': () => 'Préparer une hydratation adaptée',
    'planned.prep.heatManagement': () => 'Adapter l’échauffement et l’intensité à la chaleur',
    'planned.prep.recoveryBuffer': (params) =>
      `Prévoir +${params?.recoveryPct ?? 0} % de demande de récupération`,
    'planned.prep.confirmExposure': () => 'Confirmer extérieur / intérieur et le lieu',
  };

const THERMAL_CONDITIONS: Record<string, string> = {
  LOW: 'Conditions fraîches attendues',
  MODERATE: 'Conditions modérées attendues',
  HIGH: 'Chaleur marquée attendue',
  EXTREME: 'Stress thermique élevé attendu',
  UNKNOWN: 'Conditions incertaines',
  NOT_APPLICABLE: 'Environnement intérieur',
};

const IMPACT_SUMMARY: Record<string, string | null> = {
  NONE: null,
  MODERATE: 'Impact physiologique modéré attendu sur la séance.',
  SIGNIFICANT: 'Impact physiologique significatif — adapte l’intention avant de partir.',
};

function confidenceLabel(confidence: number): string | null {
  if (confidence >= 0.75) return 'Prévision fiable';
  if (confidence >= 0.5) return 'Prévision modérée';
  if (confidence > 0) return 'Prévision partielle';
  return null;
}

function freshnessLabel(freshness: string | null | undefined): string | null {
  if (freshness === 'FRESH') return 'Prévision à jour';
  if (freshness === 'STALE') return 'Prévision à rafraîchir';
  if (freshness === 'UNAVAILABLE') return 'Données indisponibles';
  return null;
}

export function buildPlannedSessionViewModel(input: {
  session: PlannedSessionRecord;
  context: PlannedSessionContext;
  completion?: PlannedSessionCompletionComparison | null;
}): PlannedSessionViewModel {
  const { session, context, completion } = input;
  const env = context.environment;
  const needsLocation = needsExposureConfirmation(session.type, context.intention.exposure);

  function plannedConditionsHeadline(
    needsLocation: boolean,
    env: PlannedSessionContext['environment'] | null,
  ): string | null {
    if (needsLocation) return 'Contexte à confirmer';
    if (!env) return null;
    return THERMAL_CONDITIONS[env.thermalStressLevel] ?? null;
  }

  const conditionsHeadline = plannedConditionsHeadline(needsLocation, env);

  const impactSummary = env ? (IMPACT_SUMMARY[env.trainingImpact] ?? null) : null;

  const visible =
    needsLocation ||
    Boolean(impactSummary) ||
    context.advisories.some((a) => a.kind !== 'PROCEED') ||
    context.preparation.length > 0;

  const [primaryAdvisory] = context.advisories;

  return {
    sessionId: session.id,
    context: {
      visible,
      needsLocationConfirmation: needsLocation,
      conditionsHeadline,
      conditionsDetail: primaryAdvisory
        ? (ADVISORY_RATIONALES[primaryAdvisory.rationaleCode] ?? null)
        : null,
      impactSummary,
      confidenceLabel: env ? confidenceLabel(env.confidence) : null,
      freshnessLabel: env ? freshnessLabel(env.freshness) : null,
      advisories: context.advisories.map((a) => ({
        kind: a.kind,
        headline: ADVISORY_HEADLINES[a.headlineCode] ?? a.headlineCode,
        rationale: ADVISORY_RATIONALES[a.rationaleCode] ?? a.rationaleCode,
        confidenceLabel: confidenceLabel(a.confidence),
      })),
      preparation: context.preparation.map((p) => ({
        label: PREP_LABELS[p.code]?.(p.params) ?? p.code,
      })),
      exposure: context.intention.exposure,
      locationLabel: session.locationLabel ?? context.intention.location?.label ?? null,
      emptyState: visible
        ? null
        : {
            title: 'Contexte environnemental',
            description: 'Aucun ajustement particulier avant cette séance.',
          },
    },
    completion: completion?.visible
      ? {
          visible: true,
          headline: 'Conditions prévues vs observées',
          detailLines: completion.narrativeLines,
          plannedConditionsLabel: completion.plannedThermalLabel,
          observedConditionsLabel: completion.observedThermalLabel,
        }
      : null,
  };
}
