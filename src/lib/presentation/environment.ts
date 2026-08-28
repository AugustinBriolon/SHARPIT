/**
 * Presentation mapping for environmental decision snapshot (Phase 3).
 */

import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';
import type {
  TrainingEnvironmentalImpact,
  ThermalStressLevel,
} from '@/core/inference/environment/types';

export type EnvironmentPresentationContext = {
  readonly visible: boolean;
  readonly summaryLine: string | null;
  readonly detailLine: string | null;
  readonly thermalLabel: string | null;
  readonly trainingImpact: TrainingEnvironmentalImpact | null;
};

const THERMAL_LABELS: Record<ThermalStressLevel, string | null> = {
  LOW: 'Conditions fraîches',
  MODERATE: 'Conditions modérées',
  HIGH: 'Chaleur marquée',
  EXTREME: 'Stress thermique élevé',
  UNKNOWN: null,
  NOT_APPLICABLE: null,
};

const IMPACT_SUMMARY: Record<TrainingEnvironmentalImpact, string | null> = {
  NONE: null,
  MODERATE: "L'environnement modère légèrement la récupération et la performance attendue.",
  SIGNIFICANT:
    "L'environnement pèse sur la récupération et la performance — à intégrer dans l'interprétation de la séance.",
};

function buildEnvironmentDetailLine(
  recoveryDemandAdjustment: number | null,
  performanceAdjustment: number | null,
): string | null {
  const detailParts: string[] = [];
  const recoveryPct =
    (recoveryDemandAdjustment !== undefined && recoveryDemandAdjustment !== null) ? Math.round(recoveryDemandAdjustment * 100) : null;
  const performancePct =
    (performanceAdjustment !== undefined && performanceAdjustment !== null) ? Math.round(Math.abs(performanceAdjustment) * 100) : null;

  if ((recoveryPct !== undefined && recoveryPct !== null) && recoveryPct > 0) {
    detailParts.push(`demande de récupération +${recoveryPct} %`);
  }
  if ((performancePct !== undefined && performancePct !== null) && performancePct > 0) {
    detailParts.push(`performance attendue −${performancePct} %`);
  }
  return detailParts.length > 0 ? detailParts.join(' · ') : null;
}

export function buildEnvironmentPresentationContext(
  environment: EnvironmentalDecisionSnapshot | null | undefined,
): EnvironmentPresentationContext {
  if (!environment || environment.thermalStressLevel === 'NOT_APPLICABLE') {
    return {
      visible: false,
      summaryLine: null,
      detailLine: null,
      thermalLabel: null,
      trainingImpact: null,
    };
  }

  if (environment.trainingImpact === 'NONE') {
    return {
      visible: false,
      summaryLine: null,
      detailLine: null,
      thermalLabel: THERMAL_LABELS[environment.thermalStressLevel],
      trainingImpact: 'NONE',
    };
  }

  return {
    visible: true,
    summaryLine: IMPACT_SUMMARY[environment.trainingImpact],
    detailLine: buildEnvironmentDetailLine(
      environment.recoveryDemandAdjustment,
      environment.performanceAdjustment,
    ),
    thermalLabel: THERMAL_LABELS[environment.thermalStressLevel],
    trainingImpact: environment.trainingImpact,
  };
}

export function resolveEnvironmentalExplanation(
  code: string,
  params?: Record<string, string | number>,
): string {
  const templates: Record<string, string> = {
    'environment.correction.narrative.performance':
      "Environnement : environ {penaltyPct} % du ralentissement peut s'expliquer par les conditions.",
    'environment.correction.narrative.thermalDominant': 'La chaleur est le facteur dominant.',
    'environment.correction.narrative.windDominant': 'Le vent est le facteur dominant.',
    'environment.correction.narrative.hydrationDominant': "L'humidité élevée amplifie la charge.",
    'environment.correction.narrative.combined': 'Plusieurs facteurs environnementaux se cumulent.',
  };

  const template = templates[code];
  if (!template) {
    return code;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params?.[key];
    return (value !== undefined && value !== null) ? String(value) : '';
  });
}
