import type { ReactNode } from 'react';

export type ApprovalCardStatus =
  'pending' | 'submitting' | 'approved' | 'rejected' | 'changes-requested' | 'answered';

export interface ApprovalCardOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ApprovalCardQuestion {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  options?: ApprovalCardOption[];
  multiple?: boolean;
  autoAdvance?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export interface ApprovalCardAnswer {
  selected: string[];
  custom?: string;
}

export type ApprovalCardAnswers = Record<string, ApprovalCardAnswer>;

export interface ApprovalCardProps {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  questions?: ApprovalCardQuestion[];
  status?: ApprovalCardStatus;
  answers?: ApprovalCardAnswers;
  defaultAnswers?: ApprovalCardAnswers;
  onAnswersChange?: (answers: ApprovalCardAnswers) => void;
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  onSubmit?: (answers: ApprovalCardAnswers) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestChanges?: () => void;
  onDismiss?: () => void;
  approveLabel?: ReactNode;
  rejectLabel?: ReactNode;
  requestChangesLabel?: ReactNode;
  submitLabel?: ReactNode;
  dismissAriaLabel?: string;
  /** Destructive primary action (e.g. delete planned session). */
  approveTone?: 'default' | 'destructive';
  /** Shown above actions when the primary action is destructive. */
  consequence?: ReactNode;
  disabled?: boolean;
  result?: ReactNode;
  className?: string;
}
