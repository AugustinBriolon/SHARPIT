'use client';

import { Eye, Brain, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSessionRationalePresentation } from '@/hooks/use-data';
import { GateStatusBadge } from '@/components/coach/gate-status-badge';

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

/** Athlete-facing session rationale — reads the four-bucket ViewModel, renders only. */
export function SessionRationaleCard({ sessionId }: { sessionId: string }) {
  const { data: vm, isLoading } = useSessionRationalePresentation(sessionId);

  if (isLoading || !vm) return null;
  if (vm.origin === 'MANUAL') return null;

  const { inferred, suggested, chosen, outcome } = vm;

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4">
        {inferred && (inferred.overallVerdictLabel || inferred.limitingFactorLabel) ? (
          <Section icon={Brain} label="Ce que SHARPIT a analysé">
            {inferred.overallVerdictLabel && (
              <p>Décision du jour : {inferred.overallVerdictLabel}</p>
            )}
            {inferred.limitingFactorLabel && (
              <p className="text-muted-foreground text-xs">
                Facteur limitant : {inferred.limitingFactorLabel}
                {inferred.confidenceTierLabel ? ` · ${inferred.confidenceTierLabel}` : ''}
              </p>
            )}
          </Section>
        ) : null}

        {suggested ? (
          <Section icon={Sparkles} label="Pourquoi cette séance">
            {suggested.purpose && <p>{suggested.purpose}</p>}
            {suggested.weeklyObjectiveRelation && (
              <p className="text-muted-foreground text-xs">{suggested.weeklyObjectiveRelation}</p>
            )}
            {suggested.gate.status !== 'ACCEPTED' && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <GateStatusBadge status={suggested.gate.status} />
              </div>
            )}
            {suggested.gate.findings.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {suggested.gate.findings.map((f) => (
                  <li key={f.rationale} className="text-muted-foreground text-xs leading-snug">
                    {f.rationale}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {chosen && chosen.actionHistory.length > 0 ? (
          <Section icon={CheckCircle2} label="Ce que tu as choisi">
            <ul className="space-y-1">
              {chosen.actionHistory.map((action) => (
                <li key={`${action.actionType}-${action.occurredAt}`} className="text-sm">
                  {action.label}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1 text-xs">{chosen.executionStateLabel}</p>
          </Section>
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
      </CardContent>
    </Card>
  );
}
