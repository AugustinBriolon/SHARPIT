import { describe, expect, it } from 'vitest';
import { resolveBackTargetWithoutStack } from '@/hooks/use-back-target';

describe('resolveBackTargetWithoutStack', () => {
  it('prefers an explicit override', () => {
    expect(
      resolveBackTargetWithoutStack('/activite/abc', {
        href: '/plan/semaine',
        label: 'La semaine',
      }),
    ).toEqual({ href: '/plan/semaine', label: 'La semaine', fromStack: false });
  });

  it('falls back to Activité hub for activity detail (not hard-coded Historique)', () => {
    expect(resolveBackTargetWithoutStack('/activite/cmrvpthya01xkmsm80lybbzqd')).toEqual({
      href: '/activite',
      label: 'Activité',
      fromStack: false,
    });
  });

  it('falls back to Activité for manual saisie', () => {
    expect(resolveBackTargetWithoutStack('/activite/nouvelle')).toEqual({
      href: '/activite',
      label: 'Activité',
      fromStack: false,
    });
  });

  it('falls back to Plan for the week, the brief and the block-scale drill-downs', () => {
    for (const href of ['/plan/semaine', '/plan/bilan', '/plan/charge', '/plan/adaptation']) {
      expect(resolveBackTargetWithoutStack(href)).toEqual({
        href: '/plan',
        label: 'Plan',
        fromStack: false,
      });
    }
  });

  it('falls back to Moi for Corps / Objectifs / Performance / Calibration', () => {
    for (const href of ['/moi/corps', '/moi/objectifs', '/moi/performance', '/moi/calibration']) {
      expect(resolveBackTargetWithoutStack(href)).toEqual({
        href: '/moi',
        label: 'Moi',
        fromStack: false,
      });
    }
  });

  it('falls back to Aujourd’hui for the remaining Today drill-downs', () => {
    expect(resolveBackTargetWithoutStack('/today/recovery')).toEqual({
      href: '/',
      label: 'Aujourd’hui',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/today/sleep')).toEqual({
      href: '/',
      label: 'Aujourd’hui',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/nutrition')).toEqual({
      href: '/',
      label: 'Aujourd’hui',
      fromStack: false,
    });
  });
});
