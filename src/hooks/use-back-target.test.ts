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

  it('falls back to Activité hub for activity detail (not hard-coded Historique)', () => {
    expect(resolveBackTargetWithoutStack('/training/cmrvpthya01xkmsm80lybbzqd')).toEqual({
      href: '/activite',
      label: 'Activité',
      fromStack: false,
    });
  });

  it('falls back to Activité for manual saisie', () => {
    expect(resolveBackTargetWithoutStack('/training/manual')).toEqual({
      href: '/activite',
      label: 'Activité',
      fromStack: false,
    });
  });

  it('falls back to Moi for Corps / Objectifs / Performance / Progression', () => {
    expect(resolveBackTargetWithoutStack('/moi/corps')).toEqual({
      href: '/moi',
      label: 'Moi',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/moi/objectifs')).toEqual({
      href: '/moi',
      label: 'Moi',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/progress')).toEqual({
      href: '/moi',
      label: 'Moi',
      fromStack: false,
    });
  });
});
