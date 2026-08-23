import { describe, expect, it } from 'vitest';
import { resolveBackTargetWithoutStack } from '@/hooks/use-back-target';

describe('resolveBackTargetWithoutStack', () => {
  it('prefers an explicit override', () => {
    expect(
      resolveBackTargetWithoutStack('/training/abc', {
        href: '/training',
        label: 'Ma semaine',
      }),
    ).toEqual({ href: '/training', label: 'Ma semaine', fromStack: false });
  });

  it('falls back to the route registry for activity detail', () => {
    expect(resolveBackTargetWithoutStack('/training/cmrvpthya01xkmsm80lybbzqd')).toEqual({
      href: '/training/history',
      label: 'Historique',
      fromStack: false,
    });
  });

  it('falls back home for Progression, which no longer hangs off Settings', () => {
    expect(resolveBackTargetWithoutStack('/progress')).toEqual({
      href: '/',
      label: 'Aujourd’hui',
      fromStack: false,
    });
  });
});
