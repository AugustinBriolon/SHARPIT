/**
 * Morning recalibration service — ensure / accept / reject.
 * Presentation + Decision Memory only (Core frozen).
 */

import { endOfDay, format, startOfDay } from 'date-fns';
import type { GateProposal, GateSessionResult } from '@/lib/plan-gate/types';
import { buildDecisionSnapshotContext } from '@/lib/decision-memory/build-snapshot-context';
import {
  createCoachingDecision,
  findCoachingDecisionById,
  findMorningRecalibrationDecision,
  recordDecisionAction,
} from '@/lib/decision-memory/repository';
import type { DecisionSnapshotContext } from '@/lib/decision-memory/types';
import {
  evaluateMorningSessionRecalibration,
  type MorningRecalibrationProposal,
} from '@/lib/morning-recalibration/evaluate';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { hasMorningWellnessCheckin } from '@/lib/health/wellness-checkin';
import { prisma } from '@/lib/prisma';
import { updatePlannedSession } from '@/lib/queries';

const ATHLETE_ID = 'default';

export type MorningRecalibrationPresentation = {
  decisionId: string;
  sessionId: string;
  direction: 'DOWN' | 'UP';
  changeSummary: string;
  why: string;
  status: 'PRESENTED' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED' | 'EXPIRED';
};

function toGateProposal(
  proposal: MorningRecalibrationProposal,
  session: {
    type: GateProposal['type'];
    title: string | null;
    date: Date;
  },
): GateProposal {
  return {
    sessionId: proposal.sessionId,
    action: 'MODIFY',
    date: format(session.date, 'yyyy-MM-dd'),
    startTime: null,
    type: session.type,
    intensity: proposal.toIntensity,
    durationMin: proposal.toDurationMin,
    load: proposal.toLoad,
    title: session.title,
    rationale: proposal.why,
  };
}

function toGateResult(proposal: GateProposal, direction: 'DOWN' | 'UP'): GateSessionResult {
  return {
    proposal,
    status: 'REQUIRES_CONFIRMATION',
    findings: [
      {
        ruleCode: direction === 'DOWN' ? 'MORNING_RECALIBRATION_DOWN' : 'MORNING_RECALIBRATION_UP',
        severity: 'REQUIRES_CONFIRMATION',
        rationale: proposal.rationale ?? 'Ajustement matin proposé',
        evidenceRefs: ['decision.overallVerdict', 'wellness.checkin'],
      },
    ],
    requiredAssumptions: [],
    saferAlternative: null,
  };
}

function toPresentation(
  decisionId: string,
  sessionId: string,
  mr: NonNullable<DecisionSnapshotContext['morningRecalibration']>,
  status: MorningRecalibrationPresentation['status'],
): MorningRecalibrationPresentation {
  return {
    decisionId,
    sessionId,
    direction: mr.direction,
    changeSummary: mr.changeSummary,
    why: mr.why,
    status,
  };
}

/**
 * Idempotent: evaluate today's primary planned session and create a PRESENTED
 * decision when a meaningful adjustment exists and none is open/settled yet.
 */
export async function ensureMorningRecalibration(
  trainingDayId: string,
): Promise<MorningRecalibrationPresentation | null> {
  const wellnessCompleted = await hasMorningWellnessCheckin(ATHLETE_ID, trainingDayId);
  if (!wellnessCompleted) return null;

  const existing = await findMorningRecalibrationDecision(trainingDayId);
  if (existing) {
    const mr = existing.snapshotContext.morningRecalibration;
    if (!mr || !existing.proposal.sessionId) return null;
    if (
      existing.status === 'PRESENTED' ||
      existing.status === 'ACCEPTED' ||
      existing.status === 'REJECTED'
    ) {
      return toPresentation(existing.id, existing.proposal.sessionId, mr, existing.status);
    }
    return null;
  }

  const [y, m, d] = trainingDayId.split('-').map(Number);
  const day = startOfDay(new Date(y, m - 1, d, 12, 0, 0));
  const sessions = await prisma.plannedSession.findMany({
    where: {
      date: { gte: day, lte: endOfDay(day) },
      completed: false,
      activityId: null,
    },
    orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
  });

  const session = sessions[0] ?? null;
  if (!session) return null;

  const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);
  const proposal = evaluateMorningSessionRecalibration({
    wellnessCompleted: true,
    session: {
      id: session.id,
      type: session.type,
      intensity: session.intensity,
      durationMin: session.durationMin,
      load: session.load,
      title: session.title,
      completed: session.completed,
      activityId: session.activityId,
    },
    decision: {
      overallVerdict: snapshot.decision?.overallVerdict ?? null,
      confidenceTier: snapshot.decision?.confidenceTier ?? null,
      fatigueTrainingCapacity: snapshot.fatigue?.trainingCapacity ?? null,
    },
  });

  if (!proposal) return null;

  const gateProposal = toGateProposal(proposal, session);
  const gateResult = toGateResult(gateProposal, proposal.direction);
  const baseCtx = buildDecisionSnapshotContext(snapshot);
  const snapshotContext: DecisionSnapshotContext = {
    ...baseCtx,
    morningRecalibration: {
      direction: proposal.direction,
      changeSummary: proposal.changeSummary,
      why: proposal.why,
      fromIntensity: proposal.fromIntensity,
      toIntensity: proposal.toIntensity,
      fromDurationMin: proposal.fromDurationMin,
      toDurationMin: proposal.toDurationMin,
      fromLoad: proposal.fromLoad,
      toLoad: proposal.toLoad,
    },
  };

  const decision = await createCoachingDecision({
    trainingDayId,
    source: 'PLAN_ADAPTER',
    proposal: gateProposal,
    gateResult,
    snapshotContext,
    snapshotIdAtRecommendation: null,
  });

  return toPresentation(
    decision.id,
    proposal.sessionId,
    snapshotContext.morningRecalibration!,
    'PRESENTED',
  );
}

export async function acceptMorningRecalibration(
  decisionId: string,
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const decision = await findCoachingDecisionById(decisionId);
  if (!decision?.snapshotContext.morningRecalibration) {
    return { ok: false, error: 'Proposition introuvable' };
  }
  if (decision.status !== 'PRESENTED') {
    return { ok: false, error: 'Cette proposition n’est plus en attente' };
  }

  const { sessionId } = decision.proposal;
  const mr = decision.snapshotContext.morningRecalibration;
  if (!sessionId) return { ok: false, error: 'Proposition invalide' };

  await updatePlannedSession(sessionId, {
    intensity: decision.proposal.intensity ?? undefined,
    durationMin: decision.proposal.durationMin ?? undefined,
    load: decision.proposal.load ?? undefined,
  });

  await recordDecisionAction({
    decisionId,
    actionType: 'ACCEPTED',
    source: 'PLAN_REVIEW_UI',
    resultingPlannedSessionId: sessionId,
    rationale: mr.why,
  });

  return { ok: true, sessionId };
}

export async function rejectMorningRecalibration(
  decisionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const decision = await findCoachingDecisionById(decisionId);
  if (!decision?.snapshotContext.morningRecalibration) {
    return { ok: false, error: 'Proposition introuvable' };
  }
  if (decision.status !== 'PRESENTED') {
    return { ok: false, error: 'Cette proposition n’est plus en attente' };
  }

  await recordDecisionAction({
    decisionId,
    actionType: 'REJECTED',
    source: 'PLAN_REVIEW_UI',
    rationale: 'Athlete declined morning recalibration',
  });

  return { ok: true };
}
