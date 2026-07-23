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
  if (!vm) return null;
  if (vm.origin === 'MANUAL') return null;

  const { suggested, outcome } = vm;
  const hasSuggested = Boolean(suggested);
  const hasOutcome = Boolean(outcome);

  if (!hasSuggested && !hasOutcome) return null;

  return (
    <div className="space-y-3">
      {suggested ? (
        <div className="text-foreground space-y-1.5 text-sm leading-relaxed">
          {suggested.purpose && <p>{suggested.purpose}</p>}
          {suggested.weeklyObjectiveRelation && (
            <p className="text-muted-foreground text-xs">{suggested.weeklyObjectiveRelation}</p>
          )}
          {suggested.gate.status !== 'ACCEPTED' && (
            <div className="flex items-center gap-1.5">
              <GateStatusBadge status={suggested.gate.status} />
            </div>
          )}
          {suggested.gate.findings.length > 0 && (
            <ul className="space-y-0.5">
              {suggested.gate.findings.map((f) => (
                <li key={f.rationale} className="text-muted-foreground text-xs leading-snug">
                  {f.rationale}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {outcome ? (
        <Section icon={Eye} label="Ce qui s'est passé">
          {outcome.wording.map((line) => (
            <p key={line} className="text-muted-foreground text-xs leading-relaxed">
              {line}
            </p>
          ))}
        </Section>
      ) : null}
    </div>
  );
}
