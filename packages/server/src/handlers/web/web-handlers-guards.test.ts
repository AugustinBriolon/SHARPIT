import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ admin: false, demo: false }));

vi.mock('@sharpit/server/lib/next/await-request', () => ({ awaitRequest: async () => {} }));
vi.mock('@sharpit/server/lib/auth/admin', () => ({ isCurrentUserAdmin: async () => state.admin }));
vi.mock('@sharpit/server/lib/demo/demo-session', () => ({ isDemoSession: async () => state.demo }));
vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: async () => 'ath-demo',
}));
vi.mock('@sharpit/server/lib/web/admin-athletes', () => ({
  loadAdminAthletes: async () => [{ id: 'ath-1' }],
}));
vi.mock('@sharpit/server/lib/web/demo-coach-transcript', () => ({
  loadDemoCoachTranscript: async () => ({ title: 'Démo', messages: [] }),
}));

describe('web page reads on api.', () => {
  beforeEach(() => {
    Object.assign(state, { admin: false, demo: false });
  });

  it('hides the admin athlete list from anyone but an admin', async () => {
    const { GET } = await import('./admin-athletes/handler');
    expect((await GET()).status).toBe(404);
    state.admin = true;
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'ath-1' }]);
  });

  it('serves the seeded coach transcript to the demo account only', async () => {
    const { GET } = await import('./demo-coach-transcript/handler');
    expect((await GET()).status).toBe(404);
    state.demo = true;
    expect(await (await GET()).json()).toEqual({ title: 'Démo', messages: [] });
  });
});
