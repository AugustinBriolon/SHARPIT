import { describe, expect, it, vi } from 'vitest';

vi.mock('@sharpit/server/lib/coach/context/coach-context', () => ({
  buildCoachContext: vi.fn().mockResolvedValue({ practicedSports: [] }),
  formatCoachContext: () => 'contexte',
}));
vi.mock('@sharpit/server/lib/coach/plan/calendar-availability', () => ({
  buildBusySummary: vi.fn().mockResolvedValue(''),
}));

const { buildCoachSystemPrompt } =
  await import('@sharpit/server/lib/coach/chat/coach-system-prompt');
const { coachRequestScope } = await import('@sharpit/server/lib/coach/chat/coach-request-scope');

describe('coach system prompt · moving sessions', () => {
  it('tells the coach to move sessions and bricks with updatePlannedSession, never delete and recreate', async () => {
    const { system } = await buildCoachSystemPrompt(
      'athlete-1',
      async () => null,
      coachRequestScope('planning'),
    );

    expect(system).toContain(
      'DÉPLACER / INVERSER des séances = un updatePlannedSession par séance',
    );
    expect(system).toContain('JAMAIS supprimer puis recréer');
    expect(system).toContain('un seul appel sur une jambe déplace tout le brick');
    expect(system).toContain('Un brick déjà planifié ne se recrée pas');
  });
});
