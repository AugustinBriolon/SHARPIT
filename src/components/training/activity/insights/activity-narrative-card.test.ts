import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { ActivityNarrativeCard } from './activity-narrative-card';

describe('ActivityNarrativeCard', () => {
  it('renders the coach reading on the neutral bande-ink surface with a primary dot', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityNarrativeCard, {
        activityType: ActivityType.SWIM,
        analysis: {
          headline: 'Bonne densité',
          narrative: 'Séance propre en endurance.',
        },
        narrativeAnalyzedAt: new Date('2026-07-20T10:00:00Z'),
      }),
    );

    expect(html).toContain('Lecture du coach');
    expect(html).toContain('bg-analysis-surface-alt');
    expect(html).toContain('bg-primary');
    expect(html).toContain('Bonne densité');
    expect(html).not.toContain('bg-sky-500/5');
  });
});
