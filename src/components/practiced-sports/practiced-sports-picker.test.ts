import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticedSportsPicker } from '@/components/practiced-sports/practiced-sports-picker';

describe('PracticedSportsPicker', () => {
  it('renders icon cards for core and complementary sports', () => {
    const html = renderToStaticMarkup(
      createElement(PracticedSportsPicker, {
        sports: ['run'],
        onSportsChange: () => {},
      }),
    );

    expect(html).toContain('Sports d&#x27;endurance');
    expect(html).toContain('Complémentaire si tu veux');
    expect(html).toContain('Course');
    expect(html).toContain('Triathlon');
    expect(html).toContain('Musculation');
    expect(html).toContain('Étirements');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('lucide-footprints');
    expect(html).toContain('lucide-medal');
  });

  it('sizes each grid to its group so no cell is left empty', () => {
    const html = renderToStaticMarkup(
      createElement(PracticedSportsPicker, {
        sports: ['run'],
        onSportsChange: () => {},
      }),
    );

    // 4 endurance sports on two rows, 3 complementary ones on a single row.
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('grid-cols-3');
    expect(html.match(/grid-cols-2/g)).toHaveLength(1);
    expect(html.match(/grid-cols-3/g)).toHaveLength(1);
  });

  it('marks selected sports with pressed state', () => {
    const html = renderToStaticMarkup(
      createElement(PracticedSportsPicker, {
        sports: ['run', 'bike', 'swim', 'triathlon'],
        onSportsChange: () => {},
      }),
    );

    expect(html.match(/aria-pressed="true"/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
