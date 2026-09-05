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
 * foot of the page every morning. Connected + empty now shows zeros so the shape
 * stays put and the journal is one tap away.
 */
describe('TodayNutritionCard', () => {
  it('stays on screen with zeros when nothing is logged', () => {
    useQuery.mockReturnValue({
      data: { connected: true, today: null },
      isPending: false,
      isError: false,
    });
    const html = render();

    expect(html).toContain('Nutrition');
    expect(html).toContain('0');
    expect(html).toContain('kcal');
    expect(html).toContain('Protéines');
    expect(html).toContain('Glucides');
    expect(html).toContain('Lipides');
    expect(html).not.toContain('text-label');
    expect(html).not.toContain('Rien enregistré');
    expect(html).not.toContain('Ouvrir le journal');
    expect(html.indexOf('chip-surface-lg')).toBeLessThan(html.indexOf('Nutrition'));
  });

  it('offers the connection when there is no journal behind it', () => {
    useQuery.mockReturnValue({
      data: { connected: false, today: null },
      isPending: false,
      isError: false,
    });
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
      isError: false,
    });
    const html = render();

    expect(html).toContain('847');
    expect(html).not.toContain('Rien enregistré');
    expect(html).toContain('Protéines');
    expect(html).toContain('Glucides');
    expect(html).toContain('Lipides');
  });

  it('keeps static chrome and empty rings while still loading', () => {
    useQuery.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const html = render();

    expect(html).toContain('Nutrition');
    expect(html).toContain('Total aujourd');
    expect(html).toContain('kcal');
    expect(html).toContain('Protéines');
    expect(html).not.toContain('animate-pulse');
    expect(html).not.toContain('Rien enregistré');
  });

  it('names the failure and keeps a path to the journal when the query errors', () => {
    useQuery.mockReturnValue({ data: undefined, isPending: false, isError: true });
    const html = render();

    expect(html).toContain('Journal indisponible pour le moment');
    expect(html).toContain('Ouvrir le journal');
    expect(html).not.toContain('Rien enregistré');
    expect(html).not.toContain('animate-pulse');
  });

  it('keeps over-budget copy informational and a touch clearer than remaining', () => {
    useQuery.mockReturnValue({
      data: {
        connected: true,
        today: {
          calories: 2800,
          protein: 120,
          carbohydrates: 300,
          fat: 80,
          goalsProgress: {
            calorieBudget: 2500,
            exerciseCalories: 0,
            calories: {
              consumed: 2800,
              goal: 2500,
              remaining: -300,
              pct: 100,
              unit: 'kcal',
            },
            protein: { consumed: 120, goal: 150, remaining: 30, pct: 80, unit: 'g' },
            carbohydrates: { consumed: 300, goal: 300, remaining: 0, pct: 100, unit: 'g' },
            fat: { consumed: 80, goal: 70, remaining: -10, pct: 100, unit: 'g' },
          },
        },
      },
      isPending: false,
      isError: false,
    });
    const html = render();

    expect(html).toContain('300 kcal au-dessus');
    expect(html).toContain('Objectif');
    expect(html).toContain('Total aujourd');
    expect(html).toContain('text-foreground');
    expect(html).toContain('icon-well');
    expect(html).not.toContain('text-amber-500');
    expect(html).not.toContain('signal-caution');
    expect(html).not.toContain('signal-risk');
  });
});
