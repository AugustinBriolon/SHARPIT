import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { formatDate, formatDuration } from '@/lib/format';
import { formatPlannedSessionLocationDisplay } from '@/lib/planned-session/display/planned-session-display';
import {
  attachGarminRefsToPrescription,
  extractStrengthSessionIntent,
  parseStrengthPrescription,
} from '@/lib/planned-session/strength/strength-prescription';
import { resolveStrengthSetMedia } from '@/lib/exercises';
import type { ClientPlannedSession } from '@/lib/query/types';
import { exposureLabels, intensityLabels } from '@/lib/planned-session/sessions';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import type { DisplayMode } from '@/lib/preferences/display-mode';
import type { SessionRationaleViewModel } from '@/core/presentation/session-rationale-view-model';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { ActivityType } from '@prisma/client';

export type PlannedSessionKeyChip = { label: string; value: string; valueClassName?: string };

export function buildPlannedSessionDateLabel(session: ClientPlannedSession): string {
  return formatDate(new Date(session.date)) + (session.startTime ? ` · ${session.startTime}` : '');
}

export function buildPlannedSessionChips({
  session,
  goalTitle,
  mode,
}: {
  session: ClientPlannedSession;
  goalTitle?: string;
  mode: DisplayMode;
}): PlannedSessionKeyChip[] {
  const chips: PlannedSessionKeyChip[] = [
    { label: 'Durée', value: session.durationMin ? `${session.durationMin} min` : '—' },
    {
      label: 'Charge',
      value: session.load ? formatTrainingLoad(session.load, mode) : '—',
      valueClassName: 'text-primary',
    },
    { label: 'Intensité', value: session.intensity ? intensityLabels[session.intensity] : '—' },
  ];
  if (goalTitle) {
    chips.push({ label: 'Objectif', value: goalTitle });
  }
  return chips;
}

function doneFeelingLabel(activity: NonNullable<ClientPlannedSession['activity']>): string {
  if (activity.rpe !== null) {
    return `RPE ${activity.rpe}`;
  }
  if (activity.feeling?.trim()) {
    return activity.feeling;
  }
  return '—';
}

/** Plan → réalisé chips for completed sessions in the modal header area. */
export function buildRealizedSessionChips({
  session,
  mode,
}: {
  session: ClientPlannedSession;
  mode: DisplayMode;
}): PlannedSessionKeyChip[] {
  const { activity } = session;
  if (!activity) {
    return buildPlannedSessionChips({ session, mode });
  }

  const plannedDuration = session.durationMin !== null ? `${session.durationMin} min` : '—';
  const doneDuration = activity.duration !== null ? formatDuration(activity.duration) : '—';
  const plannedLoad = session.load !== null ? formatTrainingLoad(session.load, mode) : '—';
  const doneLoad = activity.load !== null ? formatTrainingLoad(activity.load, mode) : '—';
  const plannedIntensity = session.intensity ? intensityLabels[session.intensity] : '—';
  const doneFeeling = doneFeelingLabel(activity);

  return [
    { label: 'Durée', value: `${plannedDuration} → ${doneDuration}` },
    {
      label: 'Charge',
      value: `${plannedLoad} → ${doneLoad}`,
      valueClassName: 'text-primary',
    },
    { label: 'Effort', value: `${plannedIntensity} → ${doneFeeling}` },
  ];
}

function buildLocationValue(
  session: ClientPlannedSession,
  context: PlannedSessionViewModel['context'] | null | undefined,
) {
  const showExposure = sportSupportsOutdoorContext(session.type);
  if (!showExposure) {
    return null;
  }
  const exposure = session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined;
  if (!exposure) {
    return null;
  }
  return formatPlannedSessionLocationDisplay(
    session.locationLabel ?? context?.locationLabel,
    exposureLabels[exposure],
  );
}

export function buildPlannedSessionContextMeta({
  session,
  context,
  contextPending,
  goalTitle,
}: {
  session: ClientPlannedSession;
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending: boolean;
  goalTitle?: string;
}) {
  const showExposure = sportSupportsOutdoorContext(session.type);
  const locationValue = buildLocationValue(session, context);
  const showContextPanel = Boolean(context?.visible);
  const showContextSkeleton = contextPending && showExposure && !showContextPanel;
  const contextSummary = context?.conditionsHeadline ?? locationValue ?? goalTitle ?? null;

  return { showContextPanel, showContextSkeleton, contextSummary };
}

export function buildPlannedSessionPrescription(session: ClientPlannedSession) {
  const prescriptionRaw = parseStrengthPrescription(session.strengthPrescription);
  const prescription = prescriptionRaw ? attachGarminRefsToPrescription(prescriptionRaw) : null;
  const orderedSets = prescription
    ? prescription.sets.slice().sort((a, b) => a.order - b.order)
    : [];
  const hasExerciseMedia = orderedSets.some((set) => resolveStrengthSetMedia(set) !== null);
  const strengthIntent =
    session.type === ActivityType.STRENGTH && prescription
      ? extractStrengthSessionIntent(session.description)
      : null;

  return { prescription, orderedSets, hasExerciseMedia, strengthIntent };
}

function isPushableEnduranceSport(type: ClientPlannedSession['type']) {
  return type === ActivityType.RUN || type === ActivityType.BIKE || type === ActivityType.SWIM;
}

export function buildPlannedSessionDerouleFlags({
  session,
  isRealized,
  hasStrengthPrescription,
}: {
  session: ClientPlannedSession;
  isRealized: boolean;
  hasStrengthPrescription: boolean;
}) {
  const hasStrengthPlan = session.type === ActivityType.STRENGTH && hasStrengthPrescription;
  const hasEndurancePlan = isPushableEnduranceSport(session.type) && !isRealized;
  const hasStructuredDeroule = hasStrengthPlan || hasEndurancePlan;
  const freeTextDeroule = hasStructuredDeroule ? null : session.description?.trim() || null;

  return { hasStrengthPlan, hasEndurancePlan, hasStructuredDeroule, freeTextDeroule };
}

function isPresentRationaleVm(
  rationaleVm: SessionRationaleViewModel | null | undefined,
): rationaleVm is SessionRationaleViewModel {
  return rationaleVm !== null && rationaleVm !== undefined;
}

function hasNonManualRationale(
  rationalePending: boolean,
  rationaleVm: SessionRationaleViewModel | null | undefined,
) {
  if (rationalePending) {
    return true;
  }
  if (!isPresentRationaleVm(rationaleVm) || rationaleVm.origin === 'MANUAL') {
    return false;
  }
  return Boolean(rationaleVm.suggested) || Boolean(rationaleVm.outcome);
}

function isRationaleOpenByDefault(
  isRealized: boolean,
  rationaleVm: SessionRationaleViewModel | null | undefined,
) {
  if (isRealized) {
    return false;
  }
  if (!rationaleVm?.suggested) {
    return true;
  }
  return rationaleVm.suggested.gate.status !== 'ACCEPTED';
}

export function buildPlannedSessionRationaleFlags({
  isRealized,
  rationaleVm,
  rationalePending,
}: {
  isRealized: boolean;
  rationaleVm: SessionRationaleViewModel | null | undefined;
  rationalePending: boolean;
}) {
  return {
    hasRationale: hasNonManualRationale(rationalePending, rationaleVm),
    rationaleOpenByDefault: isRationaleOpenByDefault(isRealized, rationaleVm),
  };
}
