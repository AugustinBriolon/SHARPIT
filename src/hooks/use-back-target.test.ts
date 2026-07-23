import { describe, expect, it } from 'vitest';
import { resolveBackTargetWithoutStack } from '@/hooks/use-back-target';

describe('resolveBackTargetWithoutStack', () => {
  it('prefers an explicit override', () => {
    expect(
      resolveBackTargetWithoutStack('/training/abc', {
        href: '/training',
        label: 'Entraînement',
      }),
    ).toEqual({ href: '/training', label: 'Entraînement', fromStack: false });
  });

  it('falls back to the route registry for activity detail', () => {
    expect(resolveBackTargetWithoutStack('/training/cmrvpthya01xkmsm80lybbzqd')).toEqual({
      href: '/training/history',
      label: 'Historique',
      fromStack: false,
    });
  });

  it('falls back to training for progression', () => {
    expect(resolveBackTargetWithoutStack('/training/progression')).toEqual({
      href: '/training',
      label: 'Entraînement',
      fromStack: false,
    });
  });
});
