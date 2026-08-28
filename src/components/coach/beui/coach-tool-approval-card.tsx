'use client';

import type { ToolPartLite } from '@/lib/coach/chat/coach-tool-parts';
import type { KnownSession } from '@/components/coach/chat/tool-activity';
import { useState } from 'react';
import { ApprovalCard } from '@/components/agents/approval-card';
import type { ApprovalCardStatus } from '@/components/agents/approval-card/types';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { describeApproval } from '@/components/coach/beui/coach-tool-approval-helpers';
import { createApprovalHandlers } from '@/components/coach/beui/coach-tool-approval-handlers';
import { buildApprovalCardProps } from '@/components/coach/beui/coach-tool-approval-props';

const PROPOSAL: Record<string, string> = {
  'tool-createPlannedSession': 'Ajouter une séance',
  'tool-createBrickSession': 'Ajouter un brick (multisport)',
  'tool-updatePlannedSession': 'Modifier une séance',
  'tool-deletePlannedSession': 'Supprimer une séance',
  'tool-setTravelContext': 'Enregistrer un contexte voyage',
  'tool-setTrainingConstraint': 'Enregistrer une contrainte',
};

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

  if (!approvalId) {
    return null;
  }

  const isDelete = part.type === 'tool-deletePlannedSession';
  const { headline, date } = describeApproval(part.type, part.input ?? {}, knownSessions);
  const { handleApprove, handleReject } = createApprovalHandlers({
    approvalId,
    isDelete,
    confirmDelete,
    setConfirmDelete,
    setResolvedStatus,
    onApproval,
  });

  const cardProps = buildApprovalCardProps({
    confirmDelete,
    copy: coachBeuiCopy,
    date,
    disabled,
    handleApprove,
    handleReject,
    headline,
    isDelete,
    proposal: PROPOSAL[part.type] ?? coachBeuiCopy.approvalRequired,
    resolvedStatus,
  });

  return <ApprovalCard {...cardProps} />;
}
