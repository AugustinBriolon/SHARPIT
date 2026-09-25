/**
 * Goal Cap position — projected (or measured) performance vs objective.
 * Race finish-time prediction is not available for all formats (Core frozen).
 * Never invent a race chrono from Twin form / volume.
 */

export type GoalPositionTone = 'calm' | 'caution' | 'done';
export type GoalPositionKind = 'race' | 'metric';
export type GoalPositionComparison = 'projected' | 'measured' | 'unavailable';
export type GoalPositionLegKind = 'swim' | 't1' | 'bike' | 't2' | 'run';

/** One projected segment for Cap Position instrument reading. */
export type GoalPositionLeg = {
  readonly kind: GoalPositionLegKind;
  readonly label: string;
  readonly timeLabel: string;
  readonly sharePct: number;
  readonly source: string;
};

export type GoalPositionAuditView = {
  readonly label: 'Position';
  readonly value: string;
  readonly hint: string;
  readonly tone: GoalPositionTone;
  readonly kind: GoalPositionKind;
  readonly comparison: GoalPositionComparison;
  readonly targetLabel: string | null;
  readonly projectedLabel: string | null;
  readonly gapLabel: string | null;
  readonly lead: string;
  readonly statusBody: string;
  readonly whenLine: string | null;
  readonly legs: readonly GoalPositionLeg[];
};

function whenLineFrom(countdown: string | null, countdownCaption: string | null): string | null {
  if (countdown && countdownCaption) {
    return `${countdown} · ${countdownCaption}`;
  }
  return countdown;
}

function resolveMetricTone(progressPct: number | null, gapLabel: string | null): GoalPositionTone {
  if (progressPct !== null && progressPct >= 100) {
    return 'done';
  }
  if (gapLabel) {
    return 'caution';
  }
  return 'calm';
}

type RaceAuditInput = {
  goalTitle: string;
  targetDetail: string | null;
  countdown: string | null;
  countdownCaption: string | null;
  projectedFinishLabel: string | null;
  projectedGapLabel: string | null;
  projectedStatusDetail?: string | null;
  projectedLegs?: readonly GoalPositionLeg[];
};

function raceProjectedVsTarget(input: {
  goalTitle: string;
  projected: string;
  target: string;
  projectedGapLabel: string | null;
  projectedStatusDetail?: string | null;
  whenLine: string | null;
  legs: readonly GoalPositionLeg[];
}): GoalPositionAuditView {
  const hasLegs = input.legs.length > 0;
  return {
    label: 'Position',
    value: input.projected,
    hint: `vs ${input.target}`,
    tone: input.projectedGapLabel ? 'caution' : 'calm',
    kind: 'race',
    comparison: 'projected',
    targetLabel: input.target,
    projectedLabel: input.projected,
    gapLabel: input.projectedGapLabel,
    lead: hasLegs
      ? 'Cible versus projection — lecture par segment.'
      : 'Temps projeté versus ta cible de réalisation.',
    statusBody: hasLegs
      ? ''
      : input.projectedStatusDetail?.trim() ||
        `Projection pour ${input.goalTitle} : ${input.projected} face à ${input.target}.`,
    whenLine: input.whenLine,
    legs: input.legs,
  };
}

function raceProjectedOnly(input: {
  goalTitle: string;
  projected: string;
  projectedStatusDetail?: string | null;
  whenLine: string | null;
  legs: readonly GoalPositionLeg[];
}): GoalPositionAuditView {
  const hasLegs = input.legs.length > 0;
  return {
    label: 'Position',
    value: input.projected,
    hint: 'Projection chrono',
    tone: 'calm',
    kind: 'race',
    comparison: 'projected',
    targetLabel: null,
    projectedLabel: input.projected,
    gapLabel: null,
    lead: hasLegs
      ? 'Projection par segment — déclare une cible pour comparer.'
      : 'Temps projeté — déclare une cible pour comparer.',
    statusBody: hasLegs
      ? ''
      : input.projectedStatusDetail?.trim() ||
        `Projection pour ${input.goalTitle} : ${input.projected}.`,
    whenLine: input.whenLine,
    legs: input.legs,
  };
}

function raceUnavailable(input: {
  goalTitle: string;
  target: string | null;
  whenLine: string | null;
}): GoalPositionAuditView {
  return {
    label: 'Position',
    value: '—',
    hint: input.target ? `vs ${input.target}` : 'Projection chrono indisponible',
    tone: 'calm',
    kind: 'race',
    comparison: 'unavailable',
    targetLabel: input.target,
    projectedLabel: null,
    gapLabel: null,
    lead: 'Projection du temps estimé versus ta cible.',
    statusBody: input.target
      ? `Cible : ${input.target}. Manque preuves nage, vélo ou course pour simuler.`
      : `Pas encore de projection pour ${input.goalTitle}.`,
    whenLine: input.whenLine,
    legs: [],
  };
}

function raceAudit(input: RaceAuditInput): GoalPositionAuditView {
  const target = input.targetDetail?.trim() || null;
  const projected = input.projectedFinishLabel?.trim() || null;
  const whenLine = whenLineFrom(input.countdown, input.countdownCaption);
  const legs = input.projectedLegs ?? [];
  const shared = {
    goalTitle: input.goalTitle,
    projectedStatusDetail: input.projectedStatusDetail,
    whenLine,
    legs,
  };

  if (!projected) {
    return raceUnavailable({ goalTitle: input.goalTitle, target, whenLine });
  }
  if (target) {
    return raceProjectedVsTarget({
      ...shared,
      projected,
      target,
      projectedGapLabel: input.projectedGapLabel,
    });
  }
  return raceProjectedOnly({ ...shared, projected });
}

type MetricAuditInput = {
  goalTitle: string;
  currentLabel: string | null;
  targetLabel: string | null;
  gapLabel: string | null;
  progressPct: number | null;
  countdown: string | null;
  countdownCaption: string | null;
};

function metricDone(input: {
  currentLabel: string | null;
  targetLabel: string;
  goalTitle: string;
  whenLine: string | null;
}): GoalPositionAuditView {
  return {
    label: 'Position',
    value: input.currentLabel ?? input.targetLabel,
    hint: 'Cible atteinte',
    tone: 'done',
    kind: 'metric',
    comparison: 'measured',
    targetLabel: input.targetLabel,
    projectedLabel: input.currentLabel,
    gapLabel: 'Cible atteinte',
    lead: 'Mesure actuelle versus cible de l’objectif.',
    statusBody: `Tu as atteint la cible (${input.targetLabel}) sur ${input.goalTitle}.`,
    whenLine: input.whenLine,
    legs: [],
  };
}

function metricMeasured(input: {
  currentLabel: string;
  targetLabel: string;
  gapLabel: string | null;
  tone: GoalPositionTone;
  whenLine: string | null;
}): GoalPositionAuditView {
  return {
    label: 'Position',
    value: input.currentLabel,
    hint: `vs ${input.targetLabel}`,
    tone: input.tone,
    kind: 'metric',
    comparison: 'measured',
    targetLabel: input.targetLabel,
    projectedLabel: input.currentLabel,
    gapLabel: input.gapLabel,
    lead: 'Mesure actuelle versus cible.',
    statusBody: '',
    whenLine: input.whenLine,
    legs: [],
  };
}

function metricUnavailable(input: {
  goalTitle: string;
  targetLabel: string | null;
  whenLine: string | null;
}): GoalPositionAuditView {
  return {
    label: 'Position',
    value: '—',
    hint: input.targetLabel ? `vs ${input.targetLabel}` : 'Mesure indisponible',
    tone: 'calm',
    kind: 'metric',
    comparison: 'unavailable',
    targetLabel: input.targetLabel,
    projectedLabel: null,
    gapLabel: null,
    lead: 'Mesure actuelle versus cible de l’objectif.',
    statusBody: input.targetLabel
      ? `Cible : ${input.targetLabel}. Mesure actuelle manquante.`
      : `Pas encore de couple mesure / cible pour ${input.goalTitle}.`,
    whenLine: input.whenLine,
    legs: [],
  };
}

function metricAudit(input: MetricAuditInput): GoalPositionAuditView {
  const done = input.progressPct !== null && input.progressPct >= 100;
  const whenLine = whenLineFrom(input.countdown, input.countdownCaption);
  const tone = resolveMetricTone(input.progressPct, done ? null : input.gapLabel);

  if (done && input.targetLabel) {
    return metricDone({
      currentLabel: input.currentLabel,
      targetLabel: input.targetLabel,
      goalTitle: input.goalTitle,
      whenLine,
    });
  }

  if (input.currentLabel && input.targetLabel) {
    return metricMeasured({
      currentLabel: input.currentLabel,
      targetLabel: input.targetLabel,
      gapLabel: input.gapLabel,
      tone,
      whenLine,
    });
  }

  return metricUnavailable({
    goalTitle: input.goalTitle,
    targetLabel: input.targetLabel,
    whenLine,
  });
}

export function buildGoalPositionAudit(input: {
  goalTitle: string;
  isRace: boolean;
  detail: string | null;
  currentLabel: string | null;
  targetLabel: string | null;
  gapLabel: string | null;
  progress: number | null;
  countdown: string | null;
  countdownCaption: string | null;
  projectedFinishLabel?: string | null;
  projectedGapLabel?: string | null;
  projectedStatusDetail?: string | null;
  projectedLegs?: readonly GoalPositionLeg[];
}): GoalPositionAuditView {
  if (input.isRace) {
    return raceAudit({
      goalTitle: input.goalTitle,
      targetDetail: input.detail,
      countdown: input.countdown,
      countdownCaption: input.countdownCaption,
      projectedFinishLabel: input.projectedFinishLabel ?? null,
      projectedGapLabel: input.projectedGapLabel ?? null,
      projectedStatusDetail: input.projectedStatusDetail ?? null,
      projectedLegs: input.projectedLegs,
    });
  }

  return metricAudit({
    goalTitle: input.goalTitle,
    currentLabel: input.currentLabel,
    targetLabel: input.targetLabel,
    gapLabel: input.gapLabel,
    progressPct: input.progress,
    countdown: input.countdown,
    countdownCaption: input.countdownCaption,
  });
}

/** @deprecated Prefer horizon from projection VM when Twin form is shown elsewhere. */
export function resolveFeasibilityHorizon(daysUntil: number | null): 1 | 3 | 7 | 14 {
  if (daysUntil === null || daysUntil < 0) {
    return 7;
  }
  if (daysUntil <= 1) {
    return 1;
  }
  if (daysUntil <= 3) {
    return 3;
  }
  if (daysUntil <= 7) {
    return 7;
  }
  return 14;
}
