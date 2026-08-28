'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';

export type ThreadConstraint = {
  readonly id: string;
  readonly label: string;
  readonly when: string;
  readonly note: string | null;
  readonly weekKey: string;
};

/**
 * Travel and other commitments, as constraints on the weeks they fall in.
 *
 * Not the trips section that used to sit here: those are groupings of hikes
 * already done, which constrain nothing. `AthleteTravelContext` is the model that
 * actually says "away from the 2nd to the 4th, no track" — and its only
 * consequence is on the sessions of that week, which is where it now appears.
 */
export function ThreadConstraintsCard({
  constraints,
}: {
  constraints: readonly ThreadConstraint[];
}) {
  if (constraints.length === 0) {
    return null;
  }

  return (
    <section className="chip-surface-lg rounded-analysis-lg px-4 py-4">
      <p className="text-label">Contraintes à venir</p>
      <ul className="mt-2.5 space-y-2.5">
        {constraints.map((constraint) => (
          <li key={constraint.id}>
            <p className="text-foreground text-[13.5px]">
              {constraint.label}
              <span className="text-muted-foreground text-data text-[11px]">
                {' · '}
                {constraint.when}
              </span>
            </p>
            {constraint.note ? (
              <p className="text-muted-foreground text-data mt-0.5 text-[11px]">
                {constraint.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

const CONSTRAINT_NOTE: Record<CoachMemoryEntry['trainingConstraint'], string | null> = {
  FULL: null,
  REDUCED: 'Entraînement réduit',
  MOBILITY_ONLY: 'Mobilité seulement',
  NONE: 'Pas d’entraînement structuré',
};

/** Commitments that have not ended yet, expressed as what they constrain. */
export function buildThreadConstraints(
  entries: readonly CoachMemoryEntry[],
  weekKeyOf: (date: Date) => string,
): ThreadConstraint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return entries
    .filter((entry) => new Date(entry.endDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3)
    .map((entry) => {
      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);
      const sameMonth = start.getMonth() === end.getMonth();
      const when = sameMonth
        ? `${format(start, 'd', { locale: fr })} – ${format(end, 'd MMM', { locale: fr })}`
        : `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM', { locale: fr })}`;

      return {
        id: entry.id,
        label: entry.locationLabel ?? entry.label ?? 'Contrainte',
        when,
        note: entry.note?.trim() || CONSTRAINT_NOTE[entry.trainingConstraint],
        weekKey: weekKeyOf(start),
      };
    });
}

/** "Annecy · 3 j" — what the week separator shows, short enough to sit on a rule. */
export function constraintWeekLabel(constraint: ThreadConstraint, days: number): string {
  return `${constraint.label} · ${days} j`;
}
