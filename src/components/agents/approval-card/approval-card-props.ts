import { approvalCardCopy } from './copy';
import type { ApprovalCardProps } from './types';

const DEFAULTS = {
  approveLabel: approvalCardCopy.approve,
  approveTone: 'default' as const,
  dismissAriaLabel: approvalCardCopy.dismiss,
  questions: [] as NonNullable<ApprovalCardProps['questions']>,
  rejectLabel: approvalCardCopy.reject,
  requestChangesLabel: approvalCardCopy.requestChanges,
  status: 'pending' as const,
  submitLabel: approvalCardCopy.submit,
};

export function resolveApprovalCardContentProps(props: ApprovalCardProps) {
  return {
    ...DEFAULTS,
    ...props,
    questions: props.questions ?? DEFAULTS.questions,
    status: props.status ?? DEFAULTS.status,
  };
}
