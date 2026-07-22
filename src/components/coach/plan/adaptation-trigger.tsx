'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSessionRationalePresentation } from '@/hooks/use-data';
import {
  classifyAdaptTrigger,
  type AdaptTriggerCategory,
} from '@/lib/decision-memory/classify-trigger';
import type { GateSessionResult } from '@/lib/plan-gate/types';

const TRIGGER_LABEL: Record<AdaptTriggerCategory, string> = {
  PHYSIOLOGICAL_STATE: 'ton état physiologique actuel (fatigue, récupération, charge)',
  SAFETY_POLICY: 'une règle de sécurité (santé physique, séance déjà réalisée, ou donnée invalide)',
  CALENDAR: 'ton agenda',
  GOAL: 'ton objectif ou des seuils manquants',
  ATHLETE_ACTION: "l'analyse du coach, sans déclencheur de sécurité spécifique",
};

/** Only meaningful for MODIFY changes — an ADD/REMOVE has no "previous proposal" to compare against. */
export function AdaptationTrigger({
  sessionId,
  gateResult,
}: {
  sessionId: string;
  gateResult: GateSessionResult | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const category = classifyAdaptTrigger(gateResult ?? null);
  const { data: previous, isLoading } = useSessionRationalePresentation(
    expanded ? sessionId : null,
  );

  function toggle(e: React.SyntheticEvent) {
    e.stopPropagation();
    setExpanded((v) => !v);
  }

  return (
    <div className="mt-1.5">
      {/* The parent session row is itself a <button> — this control must not be one too. */}
      <div
        className="text-muted-foreground/80 flex w-fit items-center gap-1 text-xs italic"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggle(e);
        }}
      >
        Changement lié à : {TRIGGER_LABEL[category]}
        {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </div>

      {expanded && (
        <div className="border-border/50 mt-1.5 rounded-md border p-2 text-xs">
          {isLoading && (
            <p className="text-muted-foreground">Chargement de la proposition initiale…</p>
          )}
          {!isLoading && previous?.origin === 'COACH' && (
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium tracking-wide uppercase">
                Proposition initiale
              </p>
              <p>
                {previous.observed.type}
                {previous.observed.intensityLabel ? ` · ${previous.observed.intensityLabel}` : ''}
                {previous.observed.durationMin ? ` · ${previous.observed.durationMin} min` : ''}
                {previous.observed.load ? ` · ${previous.observed.load} TSS` : ''}
              </p>
              {previous.suggested?.purpose && (
                <p className="text-muted-foreground italic">→ {previous.suggested.purpose}</p>
              )}
            </div>
          )}
          {!isLoading && previous?.origin === 'MANUAL' && (
            <p className="text-muted-foreground">
              Cette séance n&apos;avait pas été proposée par le coach à l&apos;origine.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
