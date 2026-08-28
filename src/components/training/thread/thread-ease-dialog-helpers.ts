import type { ClientPlannedSession } from '@/lib/query/types';
import {
  describeEnduranceEase,
  describeStrengthEase,
} from '@/lib/planned-session/ease-prescription';
import { parseEndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import { parseStrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';
import { easeSession } from '@/lib/training/thread/session-adjust';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';

function buildEaseDurationCells(
  session: ClientPlannedSession,
  proposal: ReturnType<typeof easeSession> | null,
) {
  const durationBefore = session.durationMin !== null ? `${session.durationMin} min` : '—';
  const proposalDurationMin = proposal?.durationMin ?? null;
  const durationAfter = proposalDurationMin !== null ? `${proposalDurationMin} min` : '—';
  const changesDuration =
    proposalDurationMin !== null && proposalDurationMin !== session.durationMin;
  return { durationBefore, durationAfter, changesDuration };
}

function buildEaseLoadCells(
  session: ClientPlannedSession,
  proposal: ReturnType<typeof easeSession> | null,
  mode: 'essential' | 'expert',
) {
  const loadBefore = session.load !== null ? formatTrainingLoad(session.load, mode) : '—';
  const proposalLoad = proposal?.load ?? null;
  const loadAfter = proposalLoad !== null ? formatTrainingLoad(proposalLoad, mode) : '—';
  const changesLoad =
    proposalLoad !== null && Math.round(proposalLoad) !== Math.round(session.load ?? 0);
  return { loadBefore, loadAfter, changesLoad };
}

function buildEasePrescriptionLines(
  session: ClientPlannedSession,
  proposal: ReturnType<typeof easeSession> | null,
) {
  const enduranceBefore = parseEndurancePrescription(session.endurancePrescription);
  const enduranceLines =
    enduranceBefore && proposal?.endurancePrescription
      ? describeEnduranceEase(enduranceBefore, proposal.endurancePrescription)
      : [];

  const strengthBefore = parseStrengthPrescription(session.strengthPrescription);
  const strengthLines =
    strengthBefore && proposal?.strengthPrescription
      ? describeStrengthEase(strengthBefore, proposal.strengthPrescription)
      : [];

  return { enduranceLines, strengthLines };
}

export function buildThreadEaseDialogData(
  session: ClientPlannedSession,
  mode: 'essential' | 'expert',
) {
  const proposal = easeSession(session);
  const { durationBefore, durationAfter, changesDuration } = buildEaseDurationCells(
    session,
    proposal,
  );
  const { loadBefore, loadAfter, changesLoad } = buildEaseLoadCells(session, proposal, mode);
  const { enduranceLines, strengthLines } = buildEasePrescriptionLines(session, proposal);

  return {
    proposal,
    enduranceLines,
    strengthLines,
    durationBefore,
    durationAfter,
    loadBefore,
    loadAfter,
    changesDuration,
    changesLoad,
  };
}
