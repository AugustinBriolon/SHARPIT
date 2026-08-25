import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ActivityType, SessionIntensity } from '@prisma/client';
import {
  applyDemoSessionLinkReading,
  DEMO_SESSION_LINK_ACTIVITY_NARRATIVE,
  DEMO_SESSION_LINK_SESSION_ANALYSIS,
} from '@/lib/demo/demo-session-link-reading';
import { markDemoSessionLinked, readDemoSessionLinks } from '@/lib/demo/demo-session-link-state';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

describe('demo-session-link-reading', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      sessionStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('stores canned analysis + narrative without calling the API', () => {
    markDemoSessionLinked('ps-1', 'act-1', {
      title: 'Footing récup — démo liaison',
      type: ActivityType.RUN,
      date: '2026-07-03T00:00:00.000Z',
      durationMin: 40,
      intensity: SessionIntensity.ENDURANCE,
      description: null,
    });

    const queryClient = new QueryClient();
    queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, [
      {
        id: 'ps-1',
        type: ActivityType.RUN,
        title: 'Footing récup — démo liaison',
        date: new Date('2026-07-03'),
        durationMin: 40,
        activityId: 'act-1',
        completed: true,
      } as ClientPlannedSession,
    ]);
    queryClient.setQueryData<ClientActivity[]>(queryKeys.activities, [
      {
        id: 'act-1',
        type: ActivityType.RUN,
        title: 'Footing récup — démo liaison (réalisé)',
        date: new Date('2026-07-03T18:00:00'),
        duration: 2400,
      } as ClientActivity,
    ]);

    applyDemoSessionLinkReading(queryClient, 'ps-1', 'act-1');

    const stored = readDemoSessionLinks()[0]?.reading;
    expect(stored?.analysis).toEqual(DEMO_SESSION_LINK_SESSION_ANALYSIS);
    expect(stored?.narrative).toEqual(DEMO_SESSION_LINK_ACTIVITY_NARRATIVE);

    const session = queryClient
      .getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions)
      ?.find((item) => item.id === 'ps-1');
    expect(session?.analysis).toEqual(DEMO_SESSION_LINK_SESSION_ANALYSIS);

    const activity = queryClient
      .getQueryData<ClientActivity[]>(queryKeys.activities)
      ?.find((item) => item.id === 'act-1') as
      | (ClientActivity & { narrativeAnalysis?: typeof DEMO_SESSION_LINK_ACTIVITY_NARRATIVE })
      | undefined;
    expect(activity?.narrativeAnalysis).toEqual(DEMO_SESSION_LINK_ACTIVITY_NARRATIVE);
    expect(activity?.plannedSession?.analysis).toEqual(DEMO_SESSION_LINK_SESSION_ANALYSIS);
  });
});
