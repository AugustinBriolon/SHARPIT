import { describe, expect, it } from 'vitest';
import {
  dietCarbCeilingG,
  findDietConflicts,
  normalizeFoodName,
  productConflictWord,
} from './nutrition-analysis-diet-rules';

describe('normalizeFoodName', () => {
  it('lowercases, strips accents and expands ligatures', () => {
    expect(normalizeFoodName('Bœuf Haché 5 %')).toBe('boeuf hache 5 %');
    expect(normalizeFoodName('Pâtes complètes')).toBe('pates completes');
  });
});

describe('productConflictWord', () => {
  it('flags meat and fish for a vegetarian', () => {
    expect(productConflictWord('vegetarian', 'Jambon blanc Herta')).toBe('jambon');
    expect(productConflictWord('vegetarian', 'Filet de saumon')).toBe('saumon');
  });

  it('matches whole words only', () => {
    // "hamburger" must not read as "ham", "pâté" must not read as "pâtes".
    expect(productConflictWord('vegetarian', 'Pain hamburger')).toBeNull();
    expect(productConflictWord('gluten_free', 'Pâté de campagne')).toBeNull();
  });

  it('lets plant alternatives through', () => {
    expect(productConflictWord('vegan', "Lait d'amande")).toBeNull();
    expect(productConflictWord('vegan', 'Yaourt soja nature')).toBeNull();
    expect(productConflictWord('vegan', 'Beurre de cacahuète')).toBeNull();
    expect(productConflictWord('dairy_free', 'Boisson avoine')).toBeNull();
  });

  it('flags dairy, eggs and honey for a vegan', () => {
    expect(productConflictWord('vegan', 'Fromage blanc 0 %')).toBe('fromage');
    expect(productConflictWord('vegan', 'Œufs brouillés')).toBe('oeufs');
    expect(productConflictWord('vegan', 'Miel de fleurs')).toBe('miel');
  });

  it('respects a gluten-free label on a gluten word', () => {
    expect(productConflictWord('gluten_free', 'Pain de mie')).toBe('pain');
    expect(productConflictWord('gluten_free', 'Pain sans gluten')).toBeNull();
  });

  it('has no product rule for macro-only diets', () => {
    expect(productConflictWord('keto', 'Pain de mie')).toBeNull();
  });
});

describe('findDietConflicts', () => {
  const entries = [
    { meal: 'Déjeuner', name: 'Poulet rôti' },
    { meal: 'Dîner', name: 'Lentilles corail' },
  ];

  it('returns nothing without a declared diet', () => {
    expect(findDietConflicts({ dietIds: [], entries, carbohydratesG: 300 })).toEqual([]);
  });

  it('reports the product with its meal', () => {
    expect(findDietConflicts({ dietIds: ['vegetarian'], entries, carbohydratesG: 200 })).toEqual([
      {
        dietId: 'vegetarian',
        kind: 'product',
        meal: 'Déjeuner',
        entry: 'Poulet rôti',
        detail: 'poulet',
      },
    ]);
  });

  it('checks the carbohydrate ceiling of keto and low carb', () => {
    const [keto] = findDietConflicts({ dietIds: ['keto'], entries: [], carbohydratesG: 82.4 });
    expect(keto).toMatchObject({ dietId: 'keto', kind: 'macro' });
    expect(keto.detail).toContain('82 g');
    expect(findDietConflicts({ dietIds: ['keto'], entries: [], carbohydratesG: 48 })).toEqual([]);
    expect(findDietConflicts({ dietIds: ['low_carb'], entries: [], carbohydratesG: 120 })).toEqual(
      [],
    );
  });
});

describe('dietCarbCeilingG', () => {
  it('keeps the tightest ceiling among declared diets', () => {
    expect(dietCarbCeilingG(['low_carb', 'keto', 'vegan'])).toBe(50);
    expect(dietCarbCeilingG(['low_carb'])).toBe(130);
    expect(dietCarbCeilingG(['vegetarian'])).toBeNull();
  });
});
