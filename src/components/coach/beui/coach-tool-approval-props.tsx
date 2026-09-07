import type { ReactNode } from 'react';
import type { ApprovalCardStatus } from '@/components/agents/approval-card/types';
import type { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import {
  resolveApproveLabel,
  resolveRejectLabel,
  type ApprovalPreview,
} from '@/components/coach/beui/coach-tool-approval-helpers';

export function ApprovalSessionPreview({ preview }: { preview: ApprovalPreview }) {
  if (!preview.intentLine && preview.derouleLines.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {preview.intentLine ? (
        <p className="text-data text-foreground/85 text-xs font-medium tabular-nums">
          {preview.intentLine}
        </p>
      ) : null}
      {preview.derouleLines.length > 0 ? (
        <ol className="text-muted-foreground space-y-0.5 text-xs leading-snug">
          {preview.derouleLines.map((line, index) => (
            <li key={`${index}-${line}`} className="text-pretty">
              {line}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function InstrumentDescription({ date, proposal }: { date?: string; proposal?: string }) {
  const parts = [date, proposal].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return (
    <span className="text-data text-muted-foreground text-xs tabular-nums">
      {parts.join(' · ')}
    </span>
  );
}

function hasApprovalPreviewContent(preview: ApprovalPreview): boolean {
  return Boolean(preview.intentLine || preview.derouleLines.length > 0);
}

function buildCardDescription(
  date: string | undefined,
  isDelete: boolean,
  proposal: string,
): ReactNode {
  if (!date && (isDelete || !proposal)) {
    return null;
  }
  return <InstrumentDescription date={date} proposal={isDelete ? undefined : proposal} />;
}

function buildCardConsequence(
  isDelete: boolean,
  confirmDelete: boolean,
  date: string | undefined,
  copy: typeof coachBeuiCopy,
): ReactNode | undefined {
  if (!isDelete || !confirmDelete) {
    return undefined;
  }
  return copy.deleteConsequence(date);
}

function buildCardPreviewChildren(
  isDelete: boolean,
  preview: ApprovalPreview | null | undefined,
): ReactNode | undefined {
  if (isDelete || !preview || !hasApprovalPreviewContent(preview)) {
    return undefined;
  }
  return <ApprovalSessionPreview preview={preview} />;
}

export function buildApprovalCardProps({
  confirmDelete,
  copy,
  date,
  disabled,
  handleApprove,
  handleReject,
  headline,
  isDelete,
  preview,
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
  preview?: ApprovalPreview | null;
  proposal: string;
  resolvedStatus: ApprovalCardStatus | null;
}): {
  approveLabel: ReactNode;
  approveTone: 'default' | 'destructive';
  chrome: 'instrument';
  consequence?: ReactNode;
  description: ReactNode;
  disabled: boolean;
  rejectLabel: ReactNode;
  status: ApprovalCardStatus;
  title: string;
  children?: ReactNode;
  onApprove: () => void;
  onReject: () => void;
} {
  return {
    approveLabel: resolveApproveLabel(isDelete, confirmDelete, copy),
    approveTone: isDelete ? ('destructive' as const) : ('default' as const),
    chrome: 'instrument',
    consequence: buildCardConsequence(isDelete, confirmDelete, date, copy),
    description: buildCardDescription(date, isDelete, proposal),
    disabled,
    rejectLabel: resolveRejectLabel(isDelete, copy),
    status: resolvedStatus ?? ('pending' as const),
    title: headline,
    children: buildCardPreviewChildren(isDelete, preview),
    onApprove: handleApprove,
    onReject: handleReject,
  };
}
