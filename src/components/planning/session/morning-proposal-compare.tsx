'use client';

import {
  buildMorningProposalCompareRows,
  type MorningProposalCompareInput,
} from '@/lib/today/morning-proposal-compare';
import { cn } from '@/lib/utils';

/**
 * Plan vs proposée when the session is opened from a morning recalibration chip.
 * Scalars compare in a compact table; déroulé is the current plan description
 * (morning V1 does not regenerate structure text).
 */
export function MorningProposalCompare({
  proposal,
  description,
}: {
  proposal: MorningProposalCompareInput;
  description: string | null | undefined;
}) {
  const rows = buildMorningProposalCompareRows(proposal.current, proposal.proposed);
  const deroule = description?.trim() || null;

  return (
    <section
      aria-label="Comparaison plan actuel et séance proposée"
      className="border-highlight/45 bg-highlight/10 rounded-analysis space-y-3 border px-3.5 py-3"
    >
      <div className="space-y-1">
        <p className="text-label">Proposition du matin</p>
        {proposal.why ? (
          <p className="text-muted-foreground text-xs leading-snug">{proposal.why}</p>
        ) : null}
      </div>

      <div className="border-analysis-border/70 overflow-hidden rounded-md border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-background/60 text-label border-analysis-border/60 border-b">
              <th className="px-2.5 py-1.5 font-medium" scope="col">
                <span className="sr-only">Élément</span>
              </th>
              <th className="px-2.5 py-1.5 font-medium" scope="col">
                Plan
              </th>
              <th className="text-highlight-foreground px-2.5 py-1.5 font-medium" scope="col">
                Proposée
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={cn(
                  'border-analysis-border/50 border-b last:border-b-0',
                  row.changed && 'bg-highlight/15',
                )}
              >
                <th className="text-muted-foreground px-2.5 py-2 text-xs font-medium" scope="row">
                  {row.label}
                </th>
                <td
                  className={cn(
                    'text-data px-2.5 py-2 tabular-nums',
                    row.changed ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {row.current}
                </td>
                <td
                  className={cn(
                    'text-data px-2.5 py-2 tabular-nums',
                    row.changed ? 'text-highlight-foreground font-semibold' : 'text-foreground',
                  )}
                >
                  {row.proposed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5">
        <p className="text-label">Déroulé du plan</p>
        {deroule ? (
          <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
            {deroule}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun déroulé renseigné sur cette séance.</p>
        )}
        <p className="text-muted-foreground text-[11px] leading-snug">
          La proposée ajuste intensité, durée et charge — le texte de structure reste celui du plan.
        </p>
      </div>
    </section>
  );
}
