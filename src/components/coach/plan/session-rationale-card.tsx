'use client';

import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessionRationalePresentation } from '@/hooks/use-data';
import { GateStatusBadge } from '@/components/coach/plan/gate-status-badge';

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-label flex items-center gap-1.5">
        <Icon className="size-3.5" />
        {label}
      </p>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/**
 * Athlete-facing session rationale — reads the ViewModel, renders only actionable buckets.
 * Rendered inside the "Pourquoi cette séance" collapsible of the planned-session modal,
 * which already carries that label — no repeated heading/card chrome here.
 */
function SuggestedRationale({
  suggested,
}: {
  suggested: NonNullable<ReturnType<typeof useSessionRationalePresentation>['data']>['suggested'];
}) {
  if (!suggested) {
    return null;
  }
  return (
    <div className="text-foreground space-y-1.5 text-sm leading-relaxed">
      {suggested.purpose ? <p>{suggested.purpose}</p> : null}
      {suggested.weeklyObjectiveRelation ? (
        <p className="text-muted-foreground text-xs">{suggested.weeklyObjectiveRelation}</p>
      ) : null}
      {suggested.gate.status !== 'ACCEPTED' ? (
        <div className="flex items-center gap-1.5">
          <GateStatusBadge status={suggested.gate.status} />
        </div>
      ) : null}
      {suggested.gate.findings.length > 0 ? (
        <ul className="space-y-0.5">
          {suggested.gate.findings.map((f) => (
            <li key={f.rationale} className="text-muted-foreground text-xs leading-snug">
              {f.rationale}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OutcomeRationale({
  outcome,
}: {
  outcome: NonNullable<ReturnType<typeof useSessionRationalePresentation>['data']>['outcome'];
}) {
  if (!outcome) {
    return null;
  }
  return (
    <Section icon={Eye} label="Ce qui s'est passé">
      {outcome.wording.map((line) => (
        <p key={line} className="text-muted-foreground text-xs leading-relaxed">
          {line}
        </p>
      ))}
    </Section>
  );
}

export function SessionRationaleCard({ sessionId }: { sessionId: string }) {
  const { data: vm, isPending } = useSessionRationalePresentation(sessionId);

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Chargement du contexte coach" className="space-y-2">
        <Skeleton className="h-4 w-full max-w-md rounded-full border-0" />
        <Skeleton className="h-4 w-3/4 max-w-sm rounded-full border-0" />
      </div>
    );
  }
  if (!vm || vm.origin === 'MANUAL') {
    return null;
  }

  const hasContent = Boolean(vm.suggested) || Boolean(vm.outcome);
  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-3">
      <SuggestedRationale suggested={vm.suggested} />
      <OutcomeRationale outcome={vm.outcome} />
    </div>
  );
}
