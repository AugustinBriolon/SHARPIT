import type { ApprovalCardStatus } from '@/components/agents/approval-card/types';

export function createApprovalHandlers({
  approvalId,
  isDelete,
  confirmDelete,
  setConfirmDelete,
  setResolvedStatus,
  onApproval,
}: {
  approvalId: string;
  isDelete: boolean;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
  setResolvedStatus: (status: ApprovalCardStatus) => void;
  onApproval: (id: string, approved: boolean) => void;
}) {
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

  return { handleApprove, handleReject };
}
