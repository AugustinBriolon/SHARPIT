'use client';

import {
  mapAdaptationDecisionToObjective,
  type AdaptationDecisionVerdict,
} from '@/lib/today-mapping';
import { resolve, resolveCode } from '@/lib/french';
import type { EngineRecommendation, TopAction } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// SessionBlock — Q3: What is today's objective? / Q4: What session?
// ─────────────────────────────────────────────────────────────────────────────

interface SessionBlockProps {
  adaptationVerdict: AdaptationDecisionVerdict | null;
  recommendation: EngineRecommendation | null;
  topAction: TopAction;
}

export function SessionBlock({ adaptationVerdict, recommendation, topAction }: SessionBlockProps) {
  const objective = adaptationVerdict ? mapAdaptationDecisionToObjective(adaptationVerdict) : null;
  const sessionTitle = resolveCode(topAction.focusCode);
  const sessionSummary = resolveCode(topAction.rationaleCode);

  return (
    <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-5">
      {/* Q3 — Objective */}
      {objective && (
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Objectif
          </p>
          <span className="bg-accent rounded-md px-2 py-0.5 text-xs font-medium">{objective}</span>
        </div>
      )}

      {/* Q4 — Recommended session */}
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Séance recommandée
        </p>
        <p className="mt-1 text-sm leading-snug font-semibold">{sessionTitle}</p>
        {sessionSummary && (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{sessionSummary}</p>
        )}
      </div>

      {/* Key evidence for session choice */}
      {recommendation?.keyEvidence && recommendation.keyEvidence.length > 0 && (
        <ul className="space-y-0.5 border-t pt-3">
          {recommendation.keyEvidence.slice(0, 3).map((e, i) => (
            <li
              key={i}
              className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
            >
              {resolve(e)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
