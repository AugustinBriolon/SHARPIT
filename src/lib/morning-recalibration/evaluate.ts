/**
 * Morning session recalibration — Presentation-layer V1.1.
 *
 * After sleep + recovery + wellness check-in, propose a bidirectional
 * adjustment of today's planned session. Never auto-applies.
 * Sport-aware: endurance ladder vs strength-like effort language + structure rewrite.
 * Reads DecisionState / session only — no new Core engine.
 */

import type { ActivityType, SessionIntensity } from '@prisma/client';
import { adaptMorningSessionDescription } from '@/lib/morning-recalibration/adapt-session-description';
import {
  isEnduranceMorningSport,
  isStrengthLikeMorningSport,
  morningIntensityLabel,
} from '@/lib/morning-recalibration/sport-intensity-labels';
import { intensityOrder } from '@/lib/planned-session/sessions';

export type MorningRecalibrationDirection = 'DOWN' | 'UP';

export type MorningRecalibrationSessionInput = {
  id: string;
  type: ActivityType;
  intensity: SessionIntensity | null;
  durationMin: number | null;
  load: number | null;
  title: string | null;
  description: string | null;
  completed: boolean;
  activityId: string | null;
};

export type MorningRecalibrationDecisionInput = {
  overallVerdict: string | null;
  confidenceTier: string | null;
  fatigueTrainingCapacity?: string | null;
};

export type MorningRecalibrationProposal = {
  sessionId: string;
  direction: MorningRecalibrationDirection;
  fromIntensity: SessionIntensity | null;
  toIntensity: SessionIntensity | null;
  fromDurationMin: number | null;
  toDurationMin: number | null;
  fromLoad: number | null;
  toLoad: number | null;
  fromDescription: string | null;
  toDescription: string | null;
  changeSummary: string;
  why: string;
};

const HIGH_INTENSITY = new Set<SessionIntensity>(['THRESHOLD', 'VO2MAX', 'RACE']);
const PROTECT_VERDICTS = new Set(['RECOVER', 'CAUTION']);
const PUSH_VERDICTS = new Set(['TRAIN_HARD']);
const SMART_VERDICTS = new Set(['TRAIN_SMART']);

/** All planned sports can receive a morning proposal — wording differs by family. */
export function isMorningRecalibrationEligibleSport(type: ActivityType): boolean {
  return isEnduranceMorningSport(type) || isStrengthLikeMorningSport(type);
}

function stepIntensity(current: SessionIntensity, delta: -1 | 1): SessionIntensity | null {
  const idx = intensityOrder.indexOf(current);
  if (idx < 0) return null;
  const next = intensityOrder[idx + delta];
  return next ?? null;
}

function summarizeChange(
  type: ActivityType,
  from: SessionIntensity | null,
  to: SessionIntensity | null,
  fromLoad: number | null,
  toLoad: number | null,
  fromDuration: number | null,
  toDuration: number | null,
  structureChanged: boolean,
): string {
  const parts: string[] = [];
  if (from && to && from !== to) {
    const fromLabel = morningIntensityLabel(type, from) ?? from;
    const toLabel = morningIntensityLabel(type, to) ?? to;
    parts.push(`${fromLabel} → ${toLabel}`);
  }
  if (fromLoad != null && toLoad != null && fromLoad !== toLoad) {
    parts.push(`charge ${Math.round(fromLoad)} → ${Math.round(toLoad)}`);
  }
  if (fromDuration != null && toDuration != null && fromDuration !== toDuration) {
    parts.push(`${fromDuration} → ${toDuration} min`);
  }
  if (structureChanged) parts.push('déroulé adapté');
  return parts.join(' · ') || 'Ajustement de séance';
}

function withDescriptions(
  type: ActivityType,
  direction: MorningRecalibrationDirection,
  fromDescription: string | null,
  base: Omit<
    MorningRecalibrationProposal,
    'fromDescription' | 'toDescription' | 'changeSummary'
  > & {
    changeSummaryParts?: never;
  },
  changeSummaryArgs: {
    from: SessionIntensity | null;
    to: SessionIntensity | null;
    fromLoad: number | null;
    toLoad: number | null;
    fromDuration: number | null;
    toDuration: number | null;
  },
): MorningRecalibrationProposal {
  const toDescription = adaptMorningSessionDescription({
    type,
    description: fromDescription,
    direction,
  });
  const structureChanged =
    isStrengthLikeMorningSport(type) && (toDescription ?? '') !== (fromDescription?.trim() || '');

  return {
    ...base,
    fromDescription: fromDescription?.trim() || null,
    toDescription,
    changeSummary: summarizeChange(
      type,
      changeSummaryArgs.from,
      changeSummaryArgs.to,
      changeSummaryArgs.fromLoad,
      changeSummaryArgs.toLoad,
      changeSummaryArgs.fromDuration,
      changeSummaryArgs.toDuration,
      structureChanged,
    ),
  };
}

/**
 * Pure evaluator — returns null when silence is the correct product answer.
 */
export function evaluateMorningSessionRecalibration(input: {
  wellnessCompleted: boolean;
  session: MorningRecalibrationSessionInput | null;
  decision: MorningRecalibrationDecisionInput | null;
}): MorningRecalibrationProposal | null {
  const { wellnessCompleted, session, decision } = input;

  if (!wellnessCompleted) return null;
  if (!session || session.completed || session.activityId) return null;
  if (!isMorningRecalibrationEligibleSport(session.type)) return null;
  if (!decision?.overallVerdict || decision.confidenceTier === 'INSUFFICIENT') return null;
  if (session.intensity == null) return null;

  const verdict = decision.overallVerdict;
  const capacity = decision.fatigueTrainingCapacity ?? null;
  const { type, intensity, load, durationMin } = session;
  const fromDescription = session.description;
  const strengthLike = isStrengthLikeMorningSport(type);

  // ── Downgrade (protect) ─────────────────────────────────────────────
  if (capacity === 'REST_ONLY' && intensity !== 'RECOVERY') {
    const toIntensity: SessionIntensity = 'RECOVERY';
    const toDuration =
      durationMin != null ? Math.min(durationMin, strengthLike ? 35 : 30) : durationMin;
    const toLoad = load != null ? Math.min(Math.round(load * 0.35), strengthLike ? 18 : 25) : null;
    return withDescriptions(
      type,
      'DOWN',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'DOWN',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: toDuration,
        fromLoad: load,
        toLoad,
        why: strengthLike
          ? 'Capacité du jour limitée au repos — garder mobilité / technique légère, pas de charges.'
          : 'Capacité du jour limitée au repos — la séance prévue est trop exigeante.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad,
        fromDuration: durationMin,
        toDuration,
      },
    );
  }

  if (
    (capacity === 'LIGHT_ONLY' || PROTECT_VERDICTS.has(verdict)) &&
    HIGH_INTENSITY.has(intensity)
  ) {
    const toIntensity: SessionIntensity = 'ENDURANCE';
    const toLoad = load != null ? Math.round(load * 0.6) : null;
    return withDescriptions(
      type,
      'DOWN',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'DOWN',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: durationMin,
        fromLoad: load,
        toLoad,
        why: strengthLike
          ? verdict === 'RECOVER' || verdict === 'CAUTION'
            ? `Verdict du matin « ${verdict} » — alléger les charges et prioriser le contrôle du mouvement.`
            : 'Capacité légère uniquement — pas de travail exigeant aujourd’hui.'
          : verdict === 'RECOVER' || verdict === 'CAUTION'
            ? `Verdict du matin « ${verdict} » — baisser l’intensité protège le risque blessure sans abandonner le plan.`
            : 'Capacité légère uniquement — la haute intensité n’est pas cohérente aujourd’hui.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad,
        fromDuration: durationMin,
        toDuration: durationMin,
      },
    );
  }

  if (PROTECT_VERDICTS.has(verdict) && intensity === 'TEMPO') {
    const toIntensity = stepIntensity(intensity, -1);
    if (!toIntensity) return null;
    const toLoad = load != null ? Math.round(load * 0.75) : null;
    return withDescriptions(
      type,
      'DOWN',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'DOWN',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: durationMin,
        fromLoad: load,
        toLoad,
        why: strengthLike
          ? 'Sommeil / récup / ressenti orientent vers la prudence — un cran plus léger, sans exercices lourds.'
          : 'Sommeil / récup / ressenti orientent vers la prudence — un cran en dessous conserve l’objectif.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad,
        fromDuration: durationMin,
        toDuration: durationMin,
      },
    );
  }

  // Strength often sits on ENDURANCE (“Léger”) while still carrying loaded work in the text.
  if (strengthLike && PROTECT_VERDICTS.has(verdict) && intensity === 'ENDURANCE') {
    const toIntensity: SessionIntensity = 'RECOVERY';
    const toLoad = load != null ? Math.round(load * 0.7) : null;
    return withDescriptions(
      type,
      'DOWN',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'DOWN',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: durationMin,
        fromLoad: load,
        toLoad,
        why: 'Prudence du matin — garder mobilité et posture, retirer le travail lesté.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad,
        fromDuration: durationMin,
        toDuration: durationMin,
      },
    );
  }

  // ── Upgrade (push, conservative) ────────────────────────────────────
  if (PUSH_VERDICTS.has(verdict) && intensity === 'RECOVERY') {
    const toIntensity: SessionIntensity = 'ENDURANCE';
    const toLoad = load != null ? Math.round(load * 1.15) : null;
    return withDescriptions(
      type,
      'UP',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'UP',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: durationMin,
        fromLoad: load,
        toLoad,
        why: strengthLike
          ? 'État du matin solide — tu peux viser un travail léger un cran au-dessus de la pure récupération.'
          : 'État du matin excellent — tu peux viser un cran au-dessus de la récupération prévue.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad,
        fromDuration: durationMin,
        toDuration: durationMin,
      },
    );
  }

  if (PUSH_VERDICTS.has(verdict) && intensity === 'ENDURANCE') {
    const toIntensity: SessionIntensity = 'TEMPO';
    const toLoad = load != null ? Math.round(load * 1.12) : null;
    return withDescriptions(
      type,
      'UP',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'UP',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: durationMin,
        fromLoad: load,
        toLoad,
        why: strengthLike
          ? 'Sommeil et ressenti solides — un cran en modéré reste cadré ; progression de charge seulement si la technique est propre.'
          : 'Sommeil et ressenti solides — un tempo léger reste cadré par l’objectif long terme.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad,
        fromDuration: durationMin,
        toDuration: durationMin,
      },
    );
  }

  // TRAIN_SMART + very easy session: soft upgrade Recovery → Endurance only
  if (
    SMART_VERDICTS.has(verdict) &&
    intensity === 'RECOVERY' &&
    decision.confidenceTier === 'HIGH'
  ) {
    const toIntensity: SessionIntensity = 'ENDURANCE';
    return withDescriptions(
      type,
      'UP',
      fromDescription,
      {
        sessionId: session.id,
        direction: 'UP',
        fromIntensity: intensity,
        toIntensity,
        fromDurationMin: durationMin,
        toDurationMin: durationMin,
        fromLoad: load,
        toLoad: load,
        why: strengthLike
          ? 'État fiable et séance très légère — un passage en travail léger reste prudent.'
          : 'État fiable et séance très légère — un passage en endurance reste prudent.',
      },
      {
        from: intensity,
        to: toIntensity,
        fromLoad: load,
        toLoad: load,
        fromDuration: durationMin,
        toDuration: durationMin,
      },
    );
  }

  return null;
}

export {
  isEnduranceMorningSport,
  isStrengthLikeMorningSport,
  morningIntensityLabel,
} from '@/lib/morning-recalibration/sport-intensity-labels';
