import { describe, expect, it } from 'vitest';

import { buildUnderstandLinks } from './today-understand-links';

const nav = {
  sleep: { label: 'Sommeil', href: '/today/sleep' },
  recovery: { label: 'Récupération', href: '/today/recovery' },
  effort: { label: 'Effort', href: '/today/effort' },
  adaptation: { label: 'Adaptation', href: '/today/adaptation' },
  physical: { label: 'Santé physique', href: '/progress?tab=body' },
  planning: { label: 'Planning', href: '/training/planning' },
};

describe('buildUnderstandLinks', () => {
  it('includes Récupération between Sommeil and Adaptation', () => {
    const labels = buildUnderstandLinks(nav).map((link) => link.label);
    expect(labels).toEqual([
      'Sommeil',
      'Récupération',
      'Adaptation',
      'Charge',
      'Régularité',
      'Nutrition',
    ]);
  });
});
