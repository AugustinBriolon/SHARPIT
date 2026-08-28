'use client';

import type { ActivityType } from '@prisma/client';
import { Check, Loader2, X } from 'lucide-react';
import { activityTypeLabels } from '@/lib/format';
import {
  failureHintForPart,
  failureLabelForPart,
  humanizeToolErrorMessage,
} from '@/lib/coach/chat/coach-tool-display';
import {
  describeToolInput,
  type SessionInput,
} from '@/components/coach/chat/tool-activity-describe';
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
  const Icon = meta.icon;
  const { headline, lines } = describeToolInput(
    part.type,
    (part.input ?? {}) as SessionInput,
    knownSessions,
  );
  const isDelete = part.type === 'tool-deletePlannedSession';

  return (
    <div className="border-analysis-border bg-background rounded-analysis overflow-hidden border transition-[color,background-color,border-color] duration-200">
      <div className="space-y-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary inline-flex size-6 items-center justify-center rounded-full">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <p className="text-muted-foreground text-xs font-medium">{meta.proposal}</p>
        </div>
        <p className="text-foreground text-sm leading-snug font-medium">{headline}</p>
        {lines.length > 0 ? (
          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
            {lines.map((line, i) => (
              <p key={i} className="text-muted-foreground text-xs leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="border-border/40 flex border-t">
        <button
          className="text-muted-foreground hover:bg-muted/50 flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors disabled:opacity-50"
          disabled={disabled}
          type="button"
          onClick={() => onApproval?.(part.approval!.id, false)}
        >
          <X className="size-3.5" aria-hidden />
          Refuser
        </button>
        <span className="border-border/40 border-l" />
        <button
          disabled={disabled}
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors disabled:opacity-50',
            isDelete
              ? 'text-destructive hover:bg-destructive/5'
              : 'text-primary hover:bg-primary/5',
          )}
          onClick={() => onApproval?.(part.approval!.id, true)}
        >
          <Check className="size-3.5" aria-hidden />
          {isDelete ? 'Supprimer' : 'Valider'}
        </button>
      </div>
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
