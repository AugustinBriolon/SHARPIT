import { approvalCardCopy } from '@/components/agents/approval-card/copy';
import type { ApprovalCardStatus } from '@/components/agents/approval-card/types';

export function getApprovalStatusLabel(status: ApprovalCardStatus): string {
  switch (status) {
    case 'submitting':
      return approvalCardCopy.status.submitting;
    case 'approved':
      return approvalCardCopy.status.approved;
    case 'rejected':
      return approvalCardCopy.status.rejected;
    case 'changes-requested':
      return approvalCardCopy.status.changesRequested;
    case 'answered':
      return approvalCardCopy.status.answered;
    default:
      return approvalCardCopy.status.pending;
  }
}

export function getApprovalStatusIconClass(status: ApprovalCardStatus): string {
  if (status === 'rejected') return 'text-signal-risk';
  if (status === 'changes-requested' || status === 'pending') return 'text-signal-caution';
  if (status === 'submitting') return 'text-muted-foreground';
  return 'text-foreground';
}

export function getApprovalStatusBadgeClass(status: ApprovalCardStatus): string {
  if (status === 'pending' || status === 'changes-requested') {
    return 'border-signal-caution/30 text-signal-caution';
  }
  if (status === 'rejected') return 'border-signal-risk/30 text-signal-risk';
  return 'border-border text-muted-foreground';
}
