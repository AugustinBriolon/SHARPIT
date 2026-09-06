'use client';

import { useState } from 'react';
import type { ActivityType } from '@prisma/client';
import { Check, Loader2, X } from 'lucide-react';
import { activityTypeLabels } from '@/lib/format';
import {
  failureHintForPart,
  failureLabelForPart,
  humanizeToolErrorMessage,
} from '@/lib/coach/chat/coach-tool-display';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import {
  buildApprovalPreview,
  resolveApproveLabel,
  resolveRejectLabel,
  type ApprovalPreview,
  type ApprovalToolInput,
} from '@/components/coach/beui/coach-tool-approval-helpers';
import { ApprovalSessionPreview } from '@/components/coach/beui/coach-tool-approval-props';
import type { KnownSession } from '@/components/coach/chat/tool-activity';
import { cn } from '@/lib/utils';

type ToolMeta = {
  label: string;
  icon: typeof Check;
  running: string;
  proposal: string;
};

type ToolPart = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string; isAutomatic?: boolean; approved?: boolean; reason?: string };
};

function asApprovalInput(input: unknown): ApprovalToolInput {
  if (!input || typeof input !== 'object') {
    return {};
  }
  return input as ApprovalToolInput;
}

function buildApprovalMetaLine(
  preview: ApprovalPreview,
  isDelete: boolean,
  proposal: string,
): string {
  return [preview.date, isDelete ? undefined : proposal].filter(Boolean).join(' · ');
}

function ApprovalRequestHeader({ headline, metaLine }: { headline: string; metaLine: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-foreground text-sm leading-snug font-medium text-pretty">{headline}</p>
      {metaLine ? (
        <p className="text-data text-muted-foreground text-xs tabular-nums">{metaLine}</p>
      ) : null}
    </div>
  );
}

function ApprovalDeleteConsequence({ show, date }: { show: boolean; date?: string }) {
  if (!show) {
    return null;
  }
  return (
    <p className="text-signal-risk text-xs leading-relaxed">
      {coachBeuiCopy.deleteConsequence(date)}
    </p>
  );
}

function ApprovalRequestActions({
  approveLabel,
  rejectLabel,
  disabled,
  isDelete,
  onApprove,
  onReject,
}: {
  approveLabel: string;
  rejectLabel: string;
  disabled?: boolean;
  isDelete: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={disabled}
        type="button"
        className={cn(
          'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
          isDelete
            ? 'text-signal-risk hover:bg-signal-risk/5'
            : 'border-border text-foreground hover:bg-muted/40 border',
        )}
        onClick={onApprove}
      >
        {approveLabel}
      </button>
      <button
        className="text-muted-foreground hover:bg-muted/40 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        disabled={disabled}
        type="button"
        onClick={onReject}
      >
        {rejectLabel}
      </button>
    </div>
  );
}

export function ToolActivityApprovalRequest({
  part,
  meta,
  knownSessions,
  onApproval,
  disabled,
}: {
  part: ToolPart;
  meta: ToolMeta;
  knownSessions: Record<string, KnownSession>;
  onApproval?: (id: string, approved: boolean) => void;
  disabled?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = buildApprovalPreview(part.type, asApprovalInput(part.input), knownSessions);
  const isDelete = part.type === 'tool-deletePlannedSession';
  const metaLine = buildApprovalMetaLine(preview, isDelete, meta.proposal);
  const approveLabel = resolveApproveLabel(isDelete, confirmDelete, coachBeuiCopy);
  const rejectLabel = resolveRejectLabel(isDelete, coachBeuiCopy);

  const handleApprove = () => {
    if (isDelete && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onApproval?.(part.approval!.id, true);
  };

  const handleReject = () => {
    setConfirmDelete(false);
    onApproval?.(part.approval!.id, false);
  };

  return (
    <div className="analysis-panel rounded-analysis space-y-2 p-3">
      <ApprovalRequestHeader headline={preview.headline} metaLine={metaLine} />
      {!isDelete ? <ApprovalSessionPreview preview={preview} /> : null}
      <ApprovalDeleteConsequence date={preview.date} show={isDelete && confirmDelete} />
      <ApprovalRequestActions
        approveLabel={approveLabel}
        disabled={disabled}
        isDelete={isDelete}
        rejectLabel={rejectLabel}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

export function ToolActivitySimpleChip({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}

function toolOutputTooltip(
  part: ToolPart,
  output: {
    title?: string | null;
    date?: string;
    locationLabel?: string;
    legs?: { title?: string | null; type?: string }[];
  },
) {
  if (part.type === 'tool-setTravelContext' && output.locationLabel) {
    return output.locationLabel;
  }
  if (part.type === 'tool-createBrickSession' && output.legs?.length) {
    const legLabels = output.legs
      .map((l) => l.title ?? (l.type ? activityTypeLabels[l.type as ActivityType] : null))
      .filter(Boolean);
    return [output.date, legLabels.join(' → ')].filter(Boolean).join(' · ') || null;
  }
  return [output.title, output.date].filter(Boolean).join(' · ') || null;
}

function toolChipTooltip(part: ToolPart, done: boolean, failed: boolean, isFailure: boolean) {
  const output = part.output as
    | {
        ok?: boolean;
        title?: string | null;
        date?: string;
        locationLabel?: string;
        legs?: { title?: string | null; type?: string }[];
      }
    | undefined;
  const isList = part.type === 'tool-listPlannedSessions';
  if (isFailure) {
    const { hint, debug } = failed
      ? humanizeToolErrorMessage(part.errorText)
      : failureHintForPart(part);
    return debug ?? hint;
  }
  if (done && !isList && output) {
    return toolOutputTooltip(part, output);
  }
  return null;
}

function toolChipStyle(done: boolean, isFailure: boolean) {
  if (isFailure) {
    return 'border-destructive/30 bg-destructive/5 text-destructive';
  }
  if (done) {
    return 'border-primary/30 bg-primary/8 text-primary';
  }
  return 'border-analysis-border/60 bg-analysis-surface-alt/60 text-muted-foreground';
}

function toolChipLabel(part: ToolPart, meta: ToolMeta, done: boolean, isFailure: boolean) {
  if (isFailure) {
    return failureLabelForPart(part);
  }
  if (done) {
    return meta.label;
  }
  return meta.running;
}

function toolChipPresentation(part: ToolPart, meta: ToolMeta) {
  const done = part.state === 'output-available';
  const failed = part.state === 'output-error';
  const output = part.output as { ok?: boolean } | undefined;
  const isFailure = failed || (done && output?.ok === false);
  return {
    done,
    failed,
    isFailure,
    chipClass: toolChipStyle(done, isFailure),
    chipLabel: toolChipLabel(part, meta, done, isFailure),
    tooltip: toolChipTooltip(part, done, failed, isFailure),
  };
}

export function ToolActivityResultChip({
  part,
  meta,
}: {
  part: ToolPart;
  meta: ToolMeta;
  streamIdle: boolean;
}) {
  const Icon = meta.icon;
  const { done, failed, isFailure, chipClass, chipLabel, tooltip } = toolChipPresentation(
    part,
    meta,
  );

  return (
    <span
      title={tooltip ?? undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        chipClass,
      )}
    >
      {!done && !failed ? <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden /> : null}
      {isFailure ? <X className="size-3 shrink-0" aria-hidden /> : null}
      {done && !isFailure ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
      {chipLabel}
    </span>
  );
}

export function ToolActivityAcceptedChip({
  meta,
  streamIdle,
}: {
  meta: ToolMeta;
  streamIdle: boolean;
}) {
  return (
    <ToolActivitySimpleChip className="border-primary/30 bg-primary/8 text-primary">
      {streamIdle ? (
        <Check className="size-3 shrink-0" aria-hidden />
      ) : (
        <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
      )}
      {streamIdle ? meta.label : meta.running}
    </ToolActivitySimpleChip>
  );
}

export function ToolActivityRejectedChip({ proposal }: { proposal: string }) {
  return (
    <ToolActivitySimpleChip className="border-analysis-border/60 bg-analysis-surface-alt/60 text-muted-foreground">
      <X className="size-3 shrink-0" aria-hidden />
      <span className="line-through">{proposal}</span>
    </ToolActivitySimpleChip>
  );
}

export function ToolActivityStaleChip({ part }: { part: ToolPart }) {
  return (
    <ToolActivitySimpleChip className="border-destructive/30 bg-destructive/5 text-destructive">
      <X className="size-3 shrink-0" aria-hidden />
      {failureLabelForPart(part)}
    </ToolActivitySimpleChip>
  );
}
