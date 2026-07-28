import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityConsistencyPanel } from './activity-consistency-panel';

describe('ActivityConsistencyPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a highlighted current streak signal', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [
          { date: new Date('2026-07-28T07:00:00Z'), load: 55 },
          { date: new Date('2026-07-20T07:00:00Z'), load: 42 },
        ],
      }),
    );

    expect(html).toContain('Série en cours');
    expect(html).toContain('sem. avec charge');
    expect(html).toContain('Semaine active');
    expect(html).toContain('analysis-panel-alt');
  });

  it('renders desktop hover details for in-range cells', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [{ date: new Date('2026-07-28T07:00:00Z'), load: 55 }],
      }),
    );

    expect(html).toContain('mardi 28 juillet 2026');
    expect(html).toContain('1 séance');
    expect(html).toContain('55 TSS');
    expect(html).toContain('group-hover/cell:opacity-100');
    expect(html).toContain('lg:block');
  });

  it('marks the current week column visually even if still open', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [{ date: new Date('2026-07-21T07:00:00Z'), load: 40 }],
      }),
    );

    expect(html).toContain('Semaine en cours encore ouverte');
    expect(html).toContain('ring-analysis-border');
    expect(html).toContain('right-0');
    expect(html).toContain('top-[calc(100%+0.45rem)]');
  });
});
