'use client';

import type { ActivityType } from '@prisma/client';
import { useState } from 'react';
import { ApprovalCard } from '@/components/agents/approval-card';
import type { ApprovalCardStatus } from '@/components/agents/approval-card/types';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import type { KnownSession } from '@/components/coach/chat/tool-activity';
import type { ToolPartLite } from '@/lib/coach/chat/coach-tool-parts';

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

function describeApproval(
  type: string,
  input: SessionInput,
  known: Record<string, KnownSession>,
): { headline: string; date?: string } {
  const ref = input.id ? known[input.id] : undefined;
  const date = input.date ?? ref?.date;

  if (type === 'tool-deletePlannedSession') {
    const headline = ref
      ? `${ref.title ?? 'Séance'}${ref.date ? ` — ${ref.date}` : ''}`
      : 'Séance ciblée';
    return { headline, date: ref?.date ?? input.date };
  }

  const headline = input.title ?? PROPOSAL[type] ?? 'Proposition';
  return { headline, date: date ?? undefined };
}

function formatDescription(headline: string, date?: string) {
  if (!date) return headline;
  return (
    <>
      {headline}
      <span className="text-instrument mt-0.5 block text-xs tabular-nums">{date}</span>
    </>
  );
}

function resolveApproveLabel(isDelete: boolean, confirmDelete: boolean) {
  if (!isDelete) return coachBeuiCopy.approve;
  if (confirmDelete) return coachBeuiCopy.confirmDelete;
  return coachBeuiCopy.delete;
}

export function CoachToolApprovalCard({
  part,
  knownSessions = {},
  disabled = false,
  onApproval,
}: {
  part: ToolPartLite;
  knownSessions?: Record<string, KnownSession>;
  disabled?: boolean;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const approvalId = part.approval?.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<ApprovalCardStatus | null>(null);

  if (!approvalId) return null;

  const proposal = PROPOSAL[part.type] ?? coachBeuiCopy.approvalRequired;
  const input = (part.input ?? {}) as SessionInput;
  const { headline, date } = describeApproval(part.type, input, knownSessions);
  const isDelete = part.type === 'tool-deletePlannedSession';

  const handleApprove = () => {
    if (isDelete && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setResolvedStatus('approved');
    onApproval(approvalId, true);
  };

  const handleReject = () => {
    setConfirmDelete(false);
    setResolvedStatus('rejected');
    onApproval(approvalId, false);
  };

  return (
    <ApprovalCard
      approveLabel={resolveApproveLabel(isDelete, confirmDelete)}
      approveTone={isDelete ? 'destructive' : 'default'}
      consequence={isDelete && confirmDelete ? coachBeuiCopy.deleteConsequence(date) : undefined}
      description={formatDescription(headline, isDelete ? undefined : date)}
      disabled={disabled}
      rejectLabel={coachBeuiCopy.reject}
      status={resolvedStatus ?? 'pending'}
      title={proposal}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
