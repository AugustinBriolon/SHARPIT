/**
 * Morning session recalibration — Presentation-layer V1.
 *
 * After sleep + recovery + wellness check-in, propose a bidirectional
 * adjustment of today's planned session. Never auto-applies.
 * Reads DecisionState / session only — no new Core engine.
 */

import type { ActivityType, SessionIntensity } from '@prisma/client';
import { intensityLabels, intensityOrder } from '@/lib/planned-session/sessions';

export type MorningRecalibrationDirection = 'DOWN' | 'UP';

export type MorningRecalibrationSessionInput = {
  id: string;
  type: ActivityType;
  intensity: SessionIntensity | null;
  durationMin: number | null;
  load: number | null;
  title: string | null;
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
  changeSummary: string;
  why: string;
};

const HIGH_INTENSITY = new Set<SessionIntensity>(['THRESHOLD', 'VO2MAX', 'RACE']);
const PROTECT_VERDICTS = new Set(['RECOVER', 'CAUTION']);
const PUSH_VERDICTS = new Set(['TRAIN_HARD']);
const SMART_VERDICTS = new Set(['TRAIN_SMART']);

function stepIntensity(current: SessionIntensity, delta: -1 | 1): SessionIntensity | null {
  const idx = intensityOrder.indexOf(current);
  if (idx < 0) return null;
  const next = intensityOrder[idx + delta];
  return next ?? null;
}

function summarizeChange(
  from: SessionIntensity | null,
  to: SessionIntensity | null,
  fromLoad: number | null,
  toLoad: number | null,
  fromDuration: number | null,
  toDuration: number | null,
): string {
  const parts: string[] = [];
  if (from && to && from !== to) {
    parts.push(`${intensityLabels[from]} → ${intensityLabels[to]}`);
  }
  if (fromLoad != null && toLoad != null && fromLoad !== toLoad) {
    parts.push(`charge ${Math.round(fromLoad)} → ${Math.round(toLoad)}`);
  }
  if (fromDuration != null && toDuration != null && fromDuration !== toDuration) {
    parts.push(`${fromDuration} → ${toDuration} min`);
  }
  return parts.join(' · ') || 'Ajustement de séance';
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
  if (!decision?.overallVerdict || decision.confidenceTier === 'INSUFFICIENT') return null;
  if (session.intensity == null) return null;

  const verdict = decision.overallVerdict;
  const capacity = decision.fatigueTrainingCapacity ?? null;
  const { intensity } = session;
  const { load } = session;
  const { durationMin } = session;

  // ── Downgrade (protect) ─────────────────────────────────────────────
  if (capacity === 'REST_ONLY' && intensity !== 'RECOVERY') {
    const toIntensity: SessionIntensity = 'RECOVERY';
    const toDuration = durationMin != null ? Math.min(durationMin, 30) : durationMin;
    const toLoad = load != null ? Math.min(Math.round(load * 0.35), 25) : null;
    return {
      sessionId: session.id,
      direction: 'DOWN',
      fromIntensity: intensity,
      toIntensity,
      fromDurationMin: durationMin,
      toDurationMin: toDuration,
      fromLoad: load,
      toLoad,
      changeSummary: summarizeChange(intensity, toIntensity, load, toLoad, durationMin, toDuration),
      why: 'Capacité du jour limitée au repos — la séance prévue est trop exigeante.',
    };
  }

  if (
    (capacity === 'LIGHT_ONLY' || PROTECT_VERDICTS.has(verdict)) &&
    HIGH_INTENSITY.has(intensity)
  ) {
    const toIntensity: SessionIntensity = 'ENDURANCE';
    const toLoad = load != null ? Math.round(load * 0.6) : null;
    return {
      sessionId: session.id,
      direction: 'DOWN',
      fromIntensity: intensity,
      toIntensity,
      fromDurationMin: durationMin,
      toDurationMin: durationMin,
      fromLoad: load,
      toLoad,
      changeSummary: summarizeChange(
        intensity,
        toIntensity,
        load,
        toLoad,
        durationMin,
        durationMin,
      ),
      why:
        verdict === 'RECOVER' || verdict === 'CAUTION'
          ? `Verdict du matin « ${verdict} » — baisser l’intensité protège le risque blessure sans abandonner le plan.`
          : 'Capacité légère uniquement — la haute intensité n’est pas cohérente aujourd’hui.',
    };
  }

  if (PROTECT_VERDICTS.has(verdict) && intensity === 'TEMPO') {
    const toIntensity = stepIntensity(intensity, -1);
    if (!toIntensity) return null;
    const toLoad = load != null ? Math.round(load * 0.75) : null;
    return {
      sessionId: session.id,
      direction: 'DOWN',
      fromIntensity: intensity,
      toIntensity,
      fromDurationMin: durationMin,
      toDurationMin: durationMin,
      fromLoad: load,
      toLoad,
      changeSummary: summarizeChange(
        intensity,
        toIntensity,
        load,
        toLoad,
        durationMin,
        durationMin,
      ),
      why: `Sommeil / récup / ressenti orientent vers la prudence — un cran en dessous conserve l’objectif.`,
    };
  }

  // ── Upgrade (push, conservative) ────────────────────────────────────
  if (PUSH_VERDICTS.has(verdict) && intensity === 'RECOVERY') {
    const toIntensity: SessionIntensity = 'ENDURANCE';
    const toLoad = load != null ? Math.round(load * 1.15) : null;
    return {
      sessionId: session.id,
      direction: 'UP',
      fromIntensity: intensity,
      toIntensity,
      fromDurationMin: durationMin,
      toDurationMin: durationMin,
      fromLoad: load,
      toLoad,
      changeSummary: summarizeChange(
        intensity,
        toIntensity,
        load,
        toLoad,
        durationMin,
        durationMin,
      ),
      why: 'État du matin excellent — tu peux viser un cran au-dessus de la récupération prévue.',
    };
  }

  if (PUSH_VERDICTS.has(verdict) && intensity === 'ENDURANCE') {
    const toIntensity: SessionIntensity = 'TEMPO';
    const toLoad = load != null ? Math.round(load * 1.12) : null;
    return {
      sessionId: session.id,
      direction: 'UP',
      fromIntensity: intensity,
      toIntensity,
      fromDurationMin: durationMin,
      toDurationMin: durationMin,
      fromLoad: load,
      toLoad,
      changeSummary: summarizeChange(
        intensity,
        toIntensity,
        load,
        toLoad,
        durationMin,
        durationMin,
      ),
      why: 'Sommeil et ressenti solides — un tempo léger reste cadré par l’objectif long terme.',
    };
  }

  // TRAIN_SMART + very easy session: soft upgrade Recovery → Endurance only
  if (
    SMART_VERDICTS.has(verdict) &&
    intensity === 'RECOVERY' &&
    decision.confidenceTier === 'HIGH'
  ) {
    const toIntensity: SessionIntensity = 'ENDURANCE';
    return {
      sessionId: session.id,
      direction: 'UP',
      fromIntensity: intensity,
      toIntensity,
      fromDurationMin: durationMin,
      toDurationMin: durationMin,
      fromLoad: load,
      toLoad: load,
      changeSummary: summarizeChange(intensity, toIntensity, load, load, durationMin, durationMin),
      why: 'État fiable et séance très légère — un passage en endurance reste prudent.',
    };
  }

  return null;
}
