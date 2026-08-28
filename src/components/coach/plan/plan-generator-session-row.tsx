'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check } from 'lucide-react';
import { GateFindingsList, GateStatusBadge } from '@/components/coach/plan/gate-status-badge';
import type { GeneratedSession } from '@/hooks/use-coach';
import { activityTypeLabels } from '@/lib/format';
import {
  formatPlannedDuration,
  intensityAccent,
  intensityLabels,
} from '@/lib/planned-session/sessions';
import type { GateSessionResult } from '@/lib/plan-gate/types';
import { cn } from '@/lib/utils';

function SessionRowCheckbox({ rejected, selected }: { rejected: boolean; selected: boolean }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
        selected && !rejected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border',
      )}
    >
      {selected && !rejected ? <Check className="size-3.5" aria-hidden /> : null}
    </span>
  );
}

function SessionRowStrengthNote({ session }: { session: GeneratedSession }) {
  const count = session.strengthPrescription?.sets?.length ?? 0;
  if (!count) {
    return null;
  }
  return (
    <p className="text-muted-foreground mt-0.5 text-xs">
      {count} exercice{count > 1 ? 's' : ''} pour la montre
    </p>
  );
}

function SessionRowHeader({
  accent,
  date,
  gateResult,
  session,
}: {
  accent: string;
  date: Date;
  gateResult?: GateSessionResult;
  session: GeneratedSession;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {format(date, 'EEE d MMM', { locale: fr })}
      </span>
      <span
        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${accent}22`, color: accent }}
      >
        {intensityLabels[session.intensity]}
      </span>
      <span className="text-muted-foreground text-xs">
        {session.startTime ? `${session.startTime} · ` : ''}
        {activityTypeLabels[session.type]} · {formatPlannedDuration(session.durationMin)} ·{' '}
        {session.load} TSS
      </span>
      {gateResult ? <GateStatusBadge status={gateResult.status} /> : null}
    </div>
  );
}

function sessionRowButtonClass(rejected: boolean, selected: boolean) {
  if (rejected) {
    return 'border-signal-risk/30 bg-signal-risk/5 cursor-not-allowed opacity-80';
  }
  if (selected) {
    return 'border-primary/40 bg-primary/5';
  }
  return 'border-analysis-border/60 bg-analysis-surface-alt/50 opacity-60 hover:opacity-100';
}

export function PlanGeneratorSessionRow({
  session,
  selected,
  onToggle,
  gateResult,
}: {
  session: GeneratedSession;
  selected: boolean;
  onToggle: () => void;
  gateResult?: GateSessionResult;
}) {
  const accent = intensityAccent[session.intensity];
  const date = parseISO(session.date);
  const rejected = gateResult?.status === 'REJECTED';

  return (
    <button
      aria-pressed={selected && !rejected}
      disabled={rejected}
      type="button"
      className={cn(
        'pressable flex w-full gap-3 rounded-lg border p-3 text-left',
        sessionRowButtonClass(rejected, selected),
      )}
      onClick={rejected ? undefined : onToggle}
    >
      <SessionRowCheckbox rejected={rejected} selected={selected} />
      <div className="min-w-0 flex-1">
        <SessionRowHeader accent={accent} date={date} gateResult={gateResult} session={session} />
        <p className="mt-1 text-sm font-medium">{session.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{session.description}</p>
        <SessionRowStrengthNote session={session} />
        {session.rationale ? (
          <p className="text-muted-foreground/80 mt-1 text-xs italic">→ {session.rationale}</p>
        ) : null}
        {gateResult ? <GateFindingsList result={gateResult} /> : null}
      </div>
    </button>
  );
}
