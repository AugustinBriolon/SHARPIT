import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityType } from '@prisma/client';

import { CompletedSessionStory } from './completed-session-story';
import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, ui));
}

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
    feeling: 'Bien',
    rpe: 4,
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
  it('leads with Lecture, score, narrative, gaps, then athlete note', () => {
    const html = renderWithQuery(
      createElement(CompletedSessionStory, { session: sessionFixture({}) }),
    );

    expect(html).toContain('Lecture');
    expect(html).toContain('Bonne densité');
    expect(html).toContain('Tu as tenu la zone tempo sans dérive.');
    expect(html).toMatch(/Note d(&#x27;|')exécution/);
    expect(html).toContain('88');
    expect(html).toContain('Conforme');
    expect(html).toMatch(/Écarts au plan/);
    expect(html).toContain('Allure stable');
    expect(html).toContain('À faire');
    expect(html).toContain('Garder ce rythme mardi.');
    expect(html).toContain('Note complémentaire');
    expect(html).toContain('Jambes légères');
    expect(html).not.toContain('Recalculer');
    expect(html).not.toContain('Discuter avec le coach');
    expect(html).not.toContain('Séance exécutée comme prévu.');

    expect(html.indexOf('Lecture')).toBeLessThan(html.indexOf('88'));
    expect(html.indexOf('88')).toBeLessThan(html.indexOf('Bonne densité'));
    expect(html.indexOf('Bonne densité')).toBeLessThan(html.indexOf('Allure stable'));
    expect(html.indexOf('Allure stable')).toBeLessThan(html.indexOf('Jambes légères'));
  });

  it('shows analyzing state on the execution score', () => {
    const html = renderWithQuery(
      createElement(CompletedSessionStory, {
        session: sessionFixture({ analysis: null, analyzedAt: null }),
        isAnalyzing: true,
      }),
    );

    expect(html).toContain('Lecture');
    expect(html).toContain('Calcul en cours…');
    expect(html).not.toContain('Séance exécutée comme prévu.');
  });

  it('falls back to compliance summary when narrative is missing', () => {
    const html = renderWithQuery(
      createElement(CompletedSessionStory, {
        session: sessionFixture({
          activity: activityFixture({
            title: 'Tempo',
            notes: null,
            feeling: null,
            rpe: null,
            narrativeAnalysis: null,
            narrativeAnalyzedAt: null,
          }),
        }),
      }),
    );

    expect(html).toContain('Séance exécutée comme prévu.');
    expect(html).toMatch(/Écarts au plan/);
    expect(html).toContain('Ajouter une note complémentaire');
  });
});
