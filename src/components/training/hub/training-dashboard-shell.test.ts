import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TrainingDashboardShell } from '@/components/training/hub/training-dashboard-shell';

describe('TrainingDashboardShell', () => {
  it('renders instrument plate, week strip, and pulse chip skeletons', () => {
    const html = renderToStaticMarkup(createElement(TrainingDashboardShell));

    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('surface-ink');
    expect(html).toContain('Rythme hebdo');
    expect(html).toContain('grid-cols-4');
    expect(html).toContain('chip-surface rounded-analysis');
    expect(html).toContain('Séances à venir');
    expect(html).toContain('Activités récentes');
    expect(html).toContain('Dynamique récente');
    // Chips 3–4 stay in DOM for desktop, hidden on mobile (prerender-safe parity).
    expect(html).toContain('hidden lg:block');
  });
});
