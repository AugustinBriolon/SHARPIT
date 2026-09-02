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

  it('falls back to Plan for planning / bilan', () => {
    expect(resolveBackTargetWithoutStack('/training/planning')).toEqual({
      href: '/plan',
      label: 'Plan',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/training/weekly-review')).toEqual({
      href: '/plan',
      label: 'Plan',
      fromStack: false,
    });
  });

  it('falls back to Moi for Corps / Objectifs / Performance / Progression / calibration', () => {
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
    expect(resolveBackTargetWithoutStack('/moi/performance')).toEqual({
      href: '/moi',
      label: 'Moi',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/progress')).toEqual({
      href: '/moi',
      label: 'Moi',
      fromStack: false,
    });
    expect(resolveBackTargetWithoutStack('/settings/calibration')).toEqual({
      href: '/moi',
      label: 'Moi',
      fromStack: false,
    });
  });

  it('falls back to Aujourd’hui for Today drill-downs', () => {
    expect(resolveBackTargetWithoutStack('/today/recovery')).toEqual({
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
