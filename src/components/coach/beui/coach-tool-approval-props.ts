import type { ApprovalCardStatus } from '@/components/agents/approval-card/types';
import type { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import {
  formatApprovalDescription,
  resolveApproveLabel,
} from '@/components/coach/beui/coach-tool-approval-helpers';

export function buildApprovalCardProps({
  confirmDelete,
  copy,
  date,
  disabled,
  handleApprove,
  handleReject,
  headline,
  isDelete,
  proposal,
  resolvedStatus,
}: {
  confirmDelete: boolean;
  copy: typeof coachBeuiCopy;
  date?: string;
  disabled: boolean;
  handleApprove: () => void;
  handleReject: () => void;
  headline: string;
  isDelete: boolean;
  proposal: string;
  resolvedStatus: ApprovalCardStatus | null;
}) {
  return {
    approveLabel: resolveApproveLabel(isDelete, confirmDelete, copy),
    approveTone: isDelete ? ('destructive' as const) : ('default' as const),
    consequence: isDelete && confirmDelete ? copy.deleteConsequence(date) : undefined,
    description: formatApprovalDescription(headline, isDelete ? undefined : date),
    disabled,
    rejectLabel: copy.reject,
    status: resolvedStatus ?? ('pending' as const),
    title: proposal,
    onApprove: handleApprove,
    onReject: handleReject,
  };
}
