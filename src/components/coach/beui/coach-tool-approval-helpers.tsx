import type { ActivityType } from '@prisma/client';
import type { KnownSession } from '@/components/coach/chat/tool-activity';
import type { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';

type SessionInput = {
  id?: string;
  date?: string;
  type?: ActivityType;
  title?: string;
};

const PROPOSAL: Record<string, string> = {
  'tool-createPlannedSession': 'Ajouter une séance',
  'tool-createBrickSession': 'Ajouter un brick (multisport)',
  'tool-updatePlannedSession': 'Modifier une séance',
  'tool-deletePlannedSession': 'Supprimer une séance',
  'tool-setTravelContext': 'Enregistrer un contexte voyage',
  'tool-setTrainingConstraint': 'Enregistrer une contrainte',
};

function describeDeleteApproval(input: SessionInput, ref?: KnownSession) {
  const headline = ref
    ? `${ref.title ?? 'Séance'}${ref.date ? ` — ${ref.date}` : ''}`
    : 'Séance ciblée';
  return { headline, date: ref?.date ?? input.date };
}

export function describeApproval(
  type: string,
  input: SessionInput,
  known: Record<string, KnownSession>,
): { headline: string; date?: string } {
  const ref = input.id ? known[input.id] : undefined;

  if (type === 'tool-deletePlannedSession') {
    return describeDeleteApproval(input, ref);
  }

  const date = input.date ?? ref?.date;
  const headline = input.title ?? PROPOSAL[type] ?? 'Proposition';
  return { headline, date: date ?? undefined };
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
