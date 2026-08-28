'use client';

import { Check } from 'lucide-react';
import { AdaptationTrigger } from '@/components/coach/plan/adaptation-trigger';
import { GateFindingsList, GateStatusBadge } from '@/components/coach/plan/gate-status-badge';
import type { AdaptChange } from '@/hooks/use-coach';
import type { ClientPlannedSession } from '@/hooks/use-data';
import type { GateSessionResult } from '@/lib/plan-gate/types';
import { cn } from '@/lib/utils';
import {
  formatChangeDate,
  changeFieldsSummary,
  ACTION_LABEL,
  ACTION_STYLE,
  adaptChangeRowClass,
  adaptChangeSelectClass,
} from './adapt-change-row-helpers';

function AdaptChangeRowHeader({
  change,
  dateStr,
  existing,
  gateResult,
}: {
  change: AdaptChange;
  dateStr: string;
  existing: ClientPlannedSession | null;
  gateResult?: GateSessionResult;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          ACTION_STYLE[change.action],
        )}
      >
        {ACTION_LABEL[change.action]}
      </span>
      {dateStr ? (
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {dateStr}
        </span>
      ) : null}
      {(change.title ?? existing?.title) ? (
        <span className="text-sm font-medium">{change.title ?? existing?.title}</span>
      ) : null}
      {gateResult ? <GateStatusBadge status={gateResult.status} /> : null}
    </div>
  );
}

function AdaptChangeStrengthLine({ change }: { change: AdaptChange }) {
  const count = change.strengthPrescription?.sets?.length;
  if (!count) {
    return null;
  }
  return (
    <p className="text-muted-foreground mt-0.5 text-xs">
      {count} exercice{count > 1 ? 's' : ''} prescrits
    </p>
  );
}

function AdaptChangeRowDetails({
  change,
  fields,
  gateResult,
}: {
  change: AdaptChange;
  fields: string;
  gateResult?: GateSessionResult;
}) {
  return (
    <>
      {fields ? <p className="text-muted-foreground mt-1 text-xs">{fields}</p> : null}
      {change.description ? (
        <p className="text-muted-foreground mt-0.5 text-xs">{change.description}</p>
      ) : null}
      <AdaptChangeStrengthLine change={change} />
      <p className="text-muted-foreground/80 mt-1 text-xs italic">→ {change.reason}</p>
      {gateResult ? <GateFindingsList result={gateResult} /> : null}
      {change.action === 'MODIFY' && change.sessionId ? (
        <AdaptationTrigger gateResult={gateResult} sessionId={change.sessionId} />
      ) : null}
    </>
  );
}

export function AdaptChangeRow({
  change,
  existing,
  gateResult,
  index,
  rejected,
  selected,
  onToggle,
}: {
  change: AdaptChange;
  existing: ClientPlannedSession | null;
  gateResult?: GateSessionResult;
  index: number;
  rejected: boolean;
  selected: boolean;
  onToggle: (index: number) => void;
}) {
  const dateStr = formatChangeDate(change.date, existing);
  const fields = changeFieldsSummary(change);

  return (
    <button
      key={index}
      disabled={rejected}
      type="button"
      className={cn(
        'pressable flex w-full gap-3 rounded-lg border p-3 text-left',
        adaptChangeRowClass(rejected, selected),
      )}
      onClick={rejected ? undefined : () => onToggle(index)}
    >
      <span className={adaptChangeSelectClass(selected, rejected)}>
        {selected && !rejected && <Check className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <AdaptChangeRowHeader
          change={change}
          dateStr={dateStr}
          existing={existing}
          gateResult={gateResult}
        />
        <AdaptChangeRowDetails change={change} fields={fields} gateResult={gateResult} />
      </div>
    </button>
  );
}
