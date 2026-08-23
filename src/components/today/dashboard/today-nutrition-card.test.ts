import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const useQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({ useQuery: (...args: unknown[]) => useQuery(...args) }));

const { TodayNutritionCard } = await import('./today-nutrition-card');

function render() {
  return renderToStaticMarkup(createElement(TodayNutritionCard));
}

/**
 * The card used to disappear on a day with nothing logged, which moved the whole
 * foot of the page every morning and hid the prompt at the one moment it was
 * worth showing — before anything had been eaten.
 */
describe('TodayNutritionCard', () => {
  it('stays on screen with nothing logged, and says so', () => {
    useQuery.mockReturnValue({ data: { connected: true, today: null }, isPending: false });
    const html = render();

    expect(html).toContain('Nutrition');
    expect(html).toContain('Rien enregistré aujourd’hui');
    expect(html).toContain('Ouvrir le journal');
  });

  it('offers the connection when there is no journal behind it', () => {
    useQuery.mockReturnValue({ data: { connected: false, today: null }, isPending: false });
    const html = render();

    expect(html).toContain('Journal alimentaire non connecté');
    expect(html).toContain('Connecter');
  });

  it('shows the figures once there are some', () => {
    useQuery.mockReturnValue({
      data: {
        connected: true,
        today: { calories: 847, protein: 24, carbohydrates: 81, fat: 49, goalsProgress: null },
      },
      isPending: false,
    });
    const html = render();

    expect(html).toContain('847');
    expect(html).not.toContain('Rien enregistré');
  });

  it('pulses rather than claiming an empty day while still loading', () => {
    useQuery.mockReturnValue({ data: undefined, isPending: true });
    const html = render();

    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('Rien enregistré');
  });
});
