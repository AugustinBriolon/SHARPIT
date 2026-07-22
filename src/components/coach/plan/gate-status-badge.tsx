import { AlertTriangle, Ban, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GateSessionResult, GateStatus } from '@/lib/plan-gate/types';

const STATUS_LABEL: Record<GateStatus, string> = {
  ACCEPTED: 'Validée',
  WARNING: 'Attention',
  REQUIRES_CONFIRMATION: 'À confirmer',
  REJECTED: 'Rejetée',
};

const STATUS_CLASS: Record<GateStatus, string> = {
  ACCEPTED: 'bg-muted text-muted-foreground',
  WARNING: 'bg-signal-caution/15 text-signal-caution',
  REQUIRES_CONFIRMATION: 'bg-[var(--color-signal-recovery)]/15 text-[var(--color-signal-recovery)]',
  REJECTED: 'bg-signal-risk/15 text-signal-risk',
};

/** Small pill summarizing a proposed session's Gate verdict. Renders nothing for ACCEPTED with no findings. */
export function GateStatusBadge({ status }: { status: GateStatus }) {
  if (status === 'ACCEPTED') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        STATUS_CLASS[status],
      )}
    >
      {status === 'REJECTED' && <Ban className="size-2.5" />}
      {status === 'WARNING' && <AlertTriangle className="size-2.5" />}
      {status === 'REQUIRES_CONFIRMATION' && <CircleHelp className="size-2.5" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Athlete-facing rationale for every Gate finding on a session — never hides why a change was made. */
export function GateFindingsList({ result }: { result: GateSessionResult }) {
  if (result.findings.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {result.findings.map((finding) => (
        <li key={finding.ruleCode} className="text-muted-foreground text-xs leading-snug">
          {finding.rationale}
        </li>
      ))}
      {result.saferAlternative && (
        <li className="text-muted-foreground/80 text-xs leading-snug italic">
          Alternative plus sûre : {result.saferAlternative.intensity ?? 'intensité inchangée'}
          {result.saferAlternative.load != null ? `, ~${result.saferAlternative.load} TSS` : ''}.
        </li>
      )}
    </ul>
  );
}
