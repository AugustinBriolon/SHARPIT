import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { KnownSession } from '@/components/coach/chat/tools/tool-activity';
import type { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { activityTypeLabels } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';

type EnduranceStepInput = {
  kind?: string;
  minutes?: number;
  meters?: number;
  effort?: SessionIntensity | string;
  notes?: string;
};

type EnduranceBlockInput = {
  times?: number;
  steps?: EnduranceStepInput[];
};

type StrengthSetInput = {
  exercise?: string;
  order?: number;
};

export type ApprovalToolInput = {
  id?: string;
  date?: string;
  type?: ActivityType;
  title?: string;
  description?: string;
  durationMin?: number;
  load?: number;
  intensity?: SessionIntensity | string;
  endurancePrescription?: { blocks?: EnduranceBlockInput[] };
  strengthPrescription?: { sets?: StrengthSetInput[] };
  legs?: Array<{
    type?: ActivityType;
    title?: string;
    durationMin?: number;
    intensity?: SessionIntensity | string;
    description?: string;
  }>;
};

export type ApprovalPreview = {
  headline: string;
  date?: string;
  intentLine: string | null;
  derouleLines: string[];
};

const PROPOSAL: Record<string, string> = {
  'tool-createPlannedSession': 'Ajouter une séance',
  'tool-createBrickSession': 'Ajouter un brick (multisport)',
  'tool-updatePlannedSession': 'Modifier une séance',
  'tool-deletePlannedSession': 'Supprimer une séance',
  'tool-setTravelContext': 'Enregistrer un contexte voyage',
  'tool-setTrainingConstraint': 'Enregistrer une contrainte',
};

const STEP_KIND_LABELS: Record<string, string> = {
  warmup: 'Échauffement',
  interval: 'Travail',
  recovery: 'Récup',
  rest: 'Repos',
  cooldown: 'Retour au calme',
};

const MAX_DEROULE_LINES = 6;

function asIntensityLabel(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (value in intensityLabels) {
    return intensityLabels[value as SessionIntensity];
  }
  return value;
}

function formatStepDuration(step: EnduranceStepInput): string | null {
  if (typeof step.minutes === 'number') {
    return `${step.minutes} min`;
  }
  if (typeof step.meters === 'number') {
    return step.meters >= 1000 ? `${step.meters / 1000} km` : `${step.meters} m`;
  }
  return null;
}

function formatEnduranceStep(step: EnduranceStepInput): string {
  const kind = step.kind ? (STEP_KIND_LABELS[step.kind] ?? step.kind) : null;
  const duration = formatStepDuration(step);
  const effort = asIntensityLabel(step.effort);
  const parts = [kind, duration, effort].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' · ');
  }
  return step.notes?.trim() || 'Étape';
}

function formatEnduranceBlockLines(block: EnduranceBlockInput): string[] {
  const steps = block.steps ?? [];
  const times = block.times && block.times > 1 ? block.times : null;
  if (times && steps.length > 0) {
    const inner = steps.map(formatEnduranceStep).join(' + ');
    return [`${times}× ${inner}`];
  }
  return steps.map(formatEnduranceStep);
}

function derouleFromEndurance(blocks: EnduranceBlockInput[] | undefined): string[] {
  if (!blocks?.length) {
    return [];
  }
  const lines: string[] = [];
  for (const block of blocks) {
    lines.push(...formatEnduranceBlockLines(block));
    if (lines.length >= MAX_DEROULE_LINES) {
      break;
    }
  }
  return lines.slice(0, MAX_DEROULE_LINES);
}

function derouleFromStrength(sets: StrengthSetInput[] | undefined): string[] {
  if (!sets?.length) {
    return [];
  }
  return sets
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((set) => set.exercise?.trim() || 'Exercice')
    .filter(Boolean)
    .slice(0, MAX_DEROULE_LINES);
}

function derouleFromDescription(description: string | undefined): string[] {
  const text = description?.trim();
  if (!text) {
    return [];
  }
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return lines.slice(0, MAX_DEROULE_LINES);
  }
  if (text.length <= 220) {
    return [text];
  }
  return [`${text.slice(0, 200).trim()}…`];
}

function buildIntentLine(input: {
  type?: ActivityType;
  durationMin?: number;
  intensity?: SessionIntensity | string;
  load?: number;
}): string | null {
  const parts: string[] = [];
  if (input.type && input.type in activityTypeLabels) {
    parts.push(activityTypeLabels[input.type]);
  }
  if (typeof input.durationMin === 'number') {
    parts.push(`${input.durationMin} min`);
  }
  const intensity = asIntensityLabel(input.intensity);
  if (intensity) {
    parts.push(intensity);
  }
  if (typeof input.load === 'number') {
    parts.push(`charge ${Math.round(input.load)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildSessionDeroule(input: ApprovalToolInput): string[] {
  const fromEndurance = derouleFromEndurance(input.endurancePrescription?.blocks);
  if (fromEndurance.length > 0) {
    return fromEndurance;
  }
  const fromStrength = derouleFromStrength(input.strengthPrescription?.sets);
  if (fromStrength.length > 0) {
    return fromStrength;
  }
  return derouleFromDescription(input.description);
}

function describeDeleteApproval(input: ApprovalToolInput, ref?: KnownSession): ApprovalPreview {
  const headline = ref
    ? `${ref.title ?? 'Séance'}${ref.date ? ` - ${ref.date}` : ''}`
    : 'Séance ciblée';
  return {
    headline,
    date: ref?.date ?? input.date,
    intentLine: null,
    derouleLines: [],
  };
}

function describeBrickApproval(input: ApprovalToolInput): ApprovalPreview {
  const legs = input.legs ?? [];
  const derouleLines = legs.map((leg) => {
    const sport =
      leg.type && leg.type in activityTypeLabels ? activityTypeLabels[leg.type] : 'Jambe';
    const title = leg.title?.trim();
    const duration = typeof leg.durationMin === 'number' ? `${leg.durationMin} min` : null;
    return [title ?? sport, duration].filter(Boolean).join(' · ');
  });
  return {
    headline: input.title?.trim() || 'Brick multisport',
    date: input.date,
    intentLine: legs.length > 0 ? `${legs.length} jambes` : null,
    derouleLines: derouleLines.slice(0, MAX_DEROULE_LINES),
  };
}

function describeDefaultApproval(
  type: string,
  input: ApprovalToolInput,
  ref?: KnownSession,
): ApprovalPreview {
  const date = input.date ?? ref?.date ?? undefined;
  const headline = input.title?.trim() || PROPOSAL[type] || 'Proposition';
  return {
    headline,
    date,
    intentLine: buildIntentLine(input),
    derouleLines: buildSessionDeroule(input),
  };
}

/**
 * Athlete-facing preview for coach tool approvals — enough to decide Valider / Refuser.
 */
export function buildApprovalPreview(
  type: string,
  input: ApprovalToolInput,
  known: Record<string, KnownSession>,
): ApprovalPreview {
  const ref = input.id ? known[input.id] : undefined;

  if (type === 'tool-deletePlannedSession') {
    return describeDeleteApproval(input, ref);
  }

  if (type === 'tool-createBrickSession') {
    return describeBrickApproval(input);
  }

  return describeDefaultApproval(type, input, ref);
}

/** @deprecated Prefer buildApprovalPreview — kept for transitional call sites. */
export function describeApproval(
  type: string,
  input: ApprovalToolInput,
  known: Record<string, KnownSession>,
): { headline: string; date?: string } {
  const preview = buildApprovalPreview(type, input, known);
  return { headline: preview.headline, date: preview.date };
}

export function formatApprovalDescription(headline: string, date?: string) {
  if (!date) {
    return headline;
  }
  return (
    <>
      {headline}
      <span className="text-instrument mt-0.5 block text-xs tabular-nums">{date}</span>
    </>
  );
}

export function resolveApproveLabel(
  isDelete: boolean,
  confirmDelete: boolean,
  copy: typeof coachBeuiCopy,
) {
  if (!isDelete) {
    return copy.approve;
  }
  if (confirmDelete) {
    return copy.confirmDelete;
  }
  return copy.delete;
}

export function resolveRejectLabel(isDelete: boolean, copy: typeof coachBeuiCopy) {
  return isDelete ? copy.keepSession : copy.reject;
}
