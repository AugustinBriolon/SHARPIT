import type { CoachDiscussTarget } from '@/lib/coach/chat/coach-discuss-href';

/**
 * Plain-language description of the context attached to a coach conversation.
 *
 * The Information Architecture requires a contextual conversation to name what
 * it carries, and to let the athlete drop it before sending. The chip built
 * from this is that contract: `label` is what the athlete reads; dismiss is
 * always optional. `sourceHref` identifies the originating surface for callers.
 */
export type CoachDiscussContext = {
  kind: CoachDiscussTarget['kind'];
  /** What is attached, in the athlete's words. */
  label: string;
  /** Surface the context came from, so it can be reviewed or changed. */
  sourceHref: string;
};

const HORIZON_LABEL: Record<number, string> = {
  1: 'demain',
  3: 'les 3 prochains jours',
  7: 'les 7 prochains jours',
  14: 'les 14 prochains jours',
};

/**
 * `name` is the resolved human name of the target — a session title, a goal,
 * a record family. Callers pass what they already loaded; when it is missing
 * the label degrades to the kind alone rather than inventing one.
 */
function discussContextForKind(
  target: CoachDiscussTarget,
  named: string | null,
): CoachDiscussContext {
  const handlers: {
    [K in CoachDiscussTarget['kind']]: (
      t: Extract<CoachDiscussTarget, { kind: K }>,
      n: string | null,
    ) => CoachDiscussContext;
  } = {
    today: () => ({ kind: 'today', label: 'Ton état du jour', sourceHref: '/' }),
    'planned-session': (_, n) => ({
      kind: 'planned-session',
      label: n ? `Séance prévue · ${n}` : 'Une séance prévue',
      sourceHref: '/training',
    }),
    activity: (t, n) => ({
      kind: 'activity',
      label: n ? `Séance réalisée · ${n}` : 'Une séance réalisée',
      sourceHref: `/training/${t.activityId}`,
    }),
    planning: (t) => ({
      kind: 'planning',
      label: `Ta semaine · ${HORIZON_LABEL[t.horizonDays] ?? `${t.horizonDays} jours`}`,
      sourceHref: '/training/planning',
    }),
    goal: (_, n) => ({
      kind: 'goal',
      label: n ? `Objectif · ${n}` : 'Un objectif',
      sourceHref: '/moi/objectifs',
    }),
    record: (_, n) => ({
      kind: 'record',
      label: n ? `Records · ${n}` : 'Tes records',
      sourceHref: '/moi/performance',
    }),
    'physical-condition': (_, n) => ({
      kind: 'physical-condition',
      label: n ? `Contrainte physique · ${n}` : 'Une contrainte physique',
      sourceHref: '/moi/corps',
    }),
  };
  return handlers[target.kind](target as never, named);
}

export function describeCoachDiscussContext(
  target: CoachDiscussTarget,
  name?: string | null,
): CoachDiscussContext {
  return discussContextForKind(target, name?.trim() || null);
}
