import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityType } from '@prisma/client';

import { CompletedSessionStory } from './completed-session-story';
import type { ClientPlannedSession } from '@/lib/query/types';

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
  it('leads with athlete capture, then coach lecture and plan gaps', () => {
    const html = renderWithQuery(
      createElement(CompletedSessionStory, { session: sessionFixture({}) }),
    );

    expect(html).toContain('aria-label="Ton ressenti"');
    expect(html).toContain('Ta note');
    expect(html).toContain('Jambes légères');
    expect(html).toContain('Bien');
    expect(html).toContain('RPE 4/10');
    expect(html).toContain('Lecture');
    expect(html).toContain('Bonne densité');
    expect(html).toContain('Tu as tenu la zone tempo sans dérive.');
    expect(html).toContain('Conforme');
    expect(html).toContain('88');
    expect(html).toContain('Écarts au plan');
    expect(html).toContain('Allure stable');
    expect(html).toContain('Garder ce rythme mardi.');
    expect(html).not.toContain('Séance exécutée comme prévu.');
    expect(html.indexOf('Jambes légères')).toBeLessThan(html.indexOf('Bonne densité'));
  });

  it('shows an analyzing badge when compliance is pending', () => {
    const html = renderWithQuery(
      createElement(CompletedSessionStory, {
        session: sessionFixture({ analysis: null, analyzedAt: null }),
        isAnalyzing: true,
      }),
    );

    expect(html).toContain('Analyse…');
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
    expect(html).toContain('Écarts au plan');
    expect(html).toContain('Ajouter ressenti et RPE');
    expect(html).toContain('Ajouter une note');
  });
});
