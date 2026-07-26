import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { ClientPlannedSession } from '@/lib/query/types';
import { seedPlannedSessionIntoCache } from './seed-planned-session-cache';

describe('seedPlannedSessionIntoCache', () => {
  it('inserts a seed when the list cache is empty', () => {
    const client = new QueryClient();
    seedPlannedSessionIntoCache(client, {
      id: 'ps-1',
      title: 'Seuil',
      description: 'Note coach',
      activityId: 'act-1',
    });

    const sessions = client.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions);
    expect(sessions).toHaveLength(1);
    expect(sessions?.[0]?.description).toBe('Note coach');
    expect(sessions?.[0]?.completed).toBe(true);
    expect(sessions?.[0]?.activityId).toBe('act-1');
  });

  it('fills missing description without wiping richer cached fields', () => {
    const client = new QueryClient();
    client.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, [
      {
        id: 'ps-1',
        title: 'Seuil',
        description: null,
        load: 70,
        activityId: 'act-1',
        completed: true,
      } as ClientPlannedSession,
    ]);

    seedPlannedSessionIntoCache(client, {
      id: 'ps-1',
      description: 'Note depuis l’activité',
    });

    const session = client.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions)?.[0];
    expect(session?.description).toBe('Note depuis l’activité');
    expect(session?.load).toBe(70);
    expect(session?.title).toBe('Seuil');
  });
});
