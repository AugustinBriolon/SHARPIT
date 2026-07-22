import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { ActivityNarrativeCard } from './activity-narrative-card';

describe('ActivityNarrativeCard', () => {
  it('tints coach analysis with sport identity, not brand primary', () => {
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

    expect(html).toContain('Analyse coach');
    expect(html).toContain('border-sky-500/30');
    expect(html).toContain('bg-sky-500/5');
    expect(html).toContain('text-sky-700');
    expect(html).not.toContain('analysis-panel-alt');
    expect(html).not.toContain('text-primary');
  });
});
