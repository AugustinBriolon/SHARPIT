import { describe, expect, it } from 'vitest';
import { COACH_CONTEXT_SECTIONS, formatNutritionSection } from './coach-context-format';
import { classifyCoachIntent, coachRequestScope } from '../chat/coach-request-scope';

describe('the coach reads what the athlete logged eating', () => {
  it('writes the day so far, and nothing without a log', () => {
    expect(formatNutritionSection({ calories: 1850, protein: 110, carbs: 210, fat: 60 })).toEqual([
      '\n## Nutrition du jour\n1850 kcal · 110 g protéines · 210 g glucides · 60 g lipides (journal à ce stade de la journée).',
    ]);
    expect(formatNutritionSection(null)).toEqual([]);
  });

  it('is a context section, read by a nutrition question', () => {
    expect(COACH_CONTEXT_SECTIONS).toContain('nutrition');
    const intent = classifyCoachIntent({ lastUserText: 'combien de protéines je dois manger ?' });
    expect(intent).toBe('nutrition');
    expect(coachRequestScope(intent).sections?.has('nutrition')).toBe(true);
  });
});
