import type { DisplayMode } from '@/lib/preferences/display-mode';
import { compareMeta } from '@/components/today/rich/morning-orientation-helpers';
import { cn } from '@/lib/utils';

type Proposal = {
  why?: string | null;
  sessionId: string;
  current: { durationMin: number | null; load: number | null; intensityLabel?: string | null };
  proposed: { durationMin: number | null; load: number | null; intensityLabel?: string | null };
};

export function proposalStatusMessage(pending: 'refresh' | 'hold' | 'apply' | null) {
  if (pending === 'refresh') {
    return 'Actualisation des preuves en cours.';
  }
  if (pending === 'apply') {
    return 'Application de la proposition en cours.';
  }
  if (pending === 'hold') {
    return 'Conservation du plan en cours.';
  }
  return null;
}

export function MorningOrientationProposalButton({
  detailSessionId,
  fromLabel,
  toLabel,
  meta,
  proposal,
  onOpenDetails,
  onPrefetch,
}: {
  detailSessionId: string | null;
  fromLabel: string;
  toLabel: string;
  meta: string | null;
  proposal: Proposal;
  onOpenDetails: () => void;
  onPrefetch: () => void;
}) {
  return (
    <button
      disabled={!detailSessionId}
      type="button"
      aria-label={
        detailSessionId
          ? `Voir le détail · ${fromLabel} vers ${toLabel}`
          : `Proposition · ${fromLabel} vers ${toLabel}`
      }
      className={cn(
        'chip-surface-lg group rounded-analysis flex min-h-11 w-full items-center gap-3 border px-3.5 py-3 text-left',
        'border-highlight/50 transition-[border-color,background-color,transform]',
        detailSessionId && 'hover:border-highlight/80 hover:bg-highlight/10',
        !detailSessionId && 'cursor-default',
      )}
      onClick={onOpenDetails}
      onFocus={onPrefetch}
      onPointerEnter={onPrefetch}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-snug font-medium">
          <span className="text-muted-foreground">{fromLabel}</span>
          <span className="text-muted-foreground/40 mx-1.5" aria-hidden>
            →
          </span>
          <span className="text-highlight-foreground">{toLabel}</span>
        </span>
        {meta ? (
          <span className="text-data text-muted-foreground text-xs tabular-nums">{meta}</span>
        ) : null}
        {proposal.why ? (
          <span className="text-muted-foreground mt-0.5 text-xs leading-snug">{proposal.why}</span>
        ) : null}
      </span>
      <span
        className="bg-highlight text-highlight-foreground text-data inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        →
      </span>
    </button>
  );
}

export function buildProposalDisplay(
  proposal: Proposal,
  mode: DisplayMode,
): {
  detailSessionId: string | null;
  fromLabel: string;
  toLabel: string;
  meta: string | null;
} {
  return {
    detailSessionId: proposal.sessionId || null,
    fromLabel: proposal.current.intensityLabel ?? '—',
    toLabel: proposal.proposed.intensityLabel ?? '—',
    meta: compareMeta(proposal.current, proposal.proposed, mode),
  };
}
