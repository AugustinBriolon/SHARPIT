import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { CompletedSessionStory } from './completed-session-story';
import type { ClientPlannedSession } from '@/lib/query/types';

function activityFixture(
  overrides: Partial<NonNullable<ClientPlannedSession['activity']>> = {},
): NonNullable<ClientPlannedSession['activity']> {
  return {
    id: 'act-1',
    type: ActivityType.RUN,
    title: 'Tempo parc',
    date: new Date('2026-07-20'),
    duration: 3600,
    load: 55,
    notes: 'Jambes légères',
    narrativeAnalysis: {
      headline: 'Bonne densité',
      narrative: 'Tu as tenu la zone tempo sans dérive.',
    },
    narrativeAnalyzedAt: new Date('2026-07-20T17:30:00Z'),
    runMetrics: null,
    bikeMetrics: null,
    swimMetrics: null,
    strengthSets: [],
    plannedSession: null,
    ...overrides,
  } as unknown as NonNullable<ClientPlannedSession['activity']>;
}

function sessionFixture(
  overrides: Partial<ClientPlannedSession> & {
    activity?: ClientPlannedSession['activity'];
  },
): ClientPlannedSession {
  return {
    id: 'ps-1',
    type: ActivityType.RUN,
    title: 'Tempo',
    date: new Date('2026-07-20'),
    analysis: {
      complianceScore: 88,
      verdict: 'AS_PLANNED',
      summary: 'Séance exécutée comme prévu.',
      remarks: ['Allure stable'],
      recommendation: 'Garder ce rythme mardi.',
    },
    analyzedAt: new Date('2026-07-20T18:00:00Z'),
    activityId: 'act-1',
    activity: activityFixture(),
    ...overrides,
  } as ClientPlannedSession;
}

describe('CompletedSessionStory', () => {
  it('leads with activity narrative and keeps compliance as status, not a second essay', () => {
    const html = renderToStaticMarkup(
      createElement(CompletedSessionStory, { session: sessionFixture({}) }),
    );

    expect(html).toContain('Lecture de la séance');
    expect(html).toContain('Bonne densité');
    expect(html).toContain('Tu as tenu la zone tempo sans dérive.');
    expect(html).toContain('Jambes légères');
    expect(html).toContain('Conforme');
    expect(html).toContain('88');
    expect(html).toContain('Écarts au plan');
    expect(html).toContain('Allure stable');
    // Compliance summary must not compete as a second coach paragraph.
    expect(html).not.toContain('Séance exécutée comme prévu.');
  });

  it('falls back to compliance summary when narrative is missing', () => {
    const html = renderToStaticMarkup(
      createElement(CompletedSessionStory, {
        session: sessionFixture({
          activity: activityFixture({
            title: 'Tempo',
            notes: null,
            narrativeAnalysis: null,
            narrativeAnalyzedAt: null,
          }),
        }),
      }),
    );

    expect(html).toContain('Séance exécutée comme prévu.');
    expect(html).toContain('Écarts au plan');
  });
});
