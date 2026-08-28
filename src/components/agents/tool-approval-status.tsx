import { Check, CircleAlert, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolApprovalStatus } from './tool-approval';

export function getStatusCopy(status: ToolApprovalStatus) {
  const labels: Record<ToolApprovalStatus, string> = {
    approving: 'Approving',
    approved: 'Approved',
    denied: 'Denied',
    running: 'Running',
    complete: 'Completed',
    error: 'Failed',
    pending: 'Approval required',
  };
  return labels[status];
}

export function getStatusBadgeClass(status: ToolApprovalStatus) {
  if (status === 'pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  if (status === 'approving' || status === 'running') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
  }
  if (status === 'approved' || status === 'complete') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400';
}

export function approvalStatusIcon(
  busy: boolean,
  error: boolean,
  status: ToolApprovalStatus,
  reduce: boolean,
) {
  if (busy) {
    return <LoaderCircle className={cn('size-4', !reduce && 'animate-spin')} />;
  }
  if (error) {
    return <CircleAlert className="size-4" />;
  }
  if (status === 'denied') {
    return <X className="size-4" />;
  }
  if (status === 'approved' || status === 'complete') {
    return <Check className="size-4" />;
  }
  return <ShieldCheck className="size-4" />;
}
