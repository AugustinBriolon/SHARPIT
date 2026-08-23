import type { CoachDiscussTarget } from '@/lib/coach/chat/coach-discuss-href';

/**
 * Plain-language description of the context attached to a coach conversation.
 *
 * The Information Architecture requires a contextual conversation to name what
 * it carries, and to let the athlete drop it before sending. The chip built
 * from this is that contract: `label` is what the athlete reads, `sourceHref`
 * is where they go to change it rather than guess.
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
export function describeCoachDiscussContext(
  target: CoachDiscussTarget,
  name?: string | null,
): CoachDiscussContext {
  const named = name?.trim() || null;

  switch (target.kind) {
    case 'today':
      return { kind: target.kind, label: 'Ton état du jour', sourceHref: '/' };
    case 'planned-session':
      return {
        kind: target.kind,
        label: named ? `Séance prévue · ${named}` : 'Une séance prévue',
        sourceHref: '/training',
      };
    case 'activity':
      return {
        kind: target.kind,
        label: named ? `Séance réalisée · ${named}` : 'Une séance réalisée',
        sourceHref: `/training/${target.activityId}`,
      };
    case 'planning':
      return {
        kind: target.kind,
        label: `Ta semaine · ${HORIZON_LABEL[target.horizonDays] ?? `${target.horizonDays} jours`}`,
        sourceHref: '/training/planning',
      };
    case 'goal':
      return {
        kind: target.kind,
        label: named ? `Objectif · ${named}` : 'Un objectif',
        sourceHref: '/settings/goals',
      };
    case 'record':
      return {
        kind: target.kind,
        label: named ? `Records · ${named}` : 'Tes records',
        sourceHref: '/biology?tab=records',
      };
    case 'physical-condition':
      return {
        kind: target.kind,
        label: named ? `Contrainte physique · ${named}` : 'Une contrainte physique',
        sourceHref: '/biology?tab=suivi',
      };
  }
}
