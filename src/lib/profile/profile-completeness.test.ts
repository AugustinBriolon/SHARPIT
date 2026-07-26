import { describe, expect, it } from 'vitest';
import { getProfileCompleteness } from './profile-completeness';

describe('getProfileCompleteness', () => {
  it('points thresholds gap to progression calibration', () => {
    const result = getProfileCompleteness(null, 'Dispo le soir');
    expect(result.isComplete).toBe(false);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toMatchObject({
      key: 'thresholds',
      href: '/training/progression?tab=calibration',
    });
  });

  it('points context gap to settings memory', () => {
    const result = getProfileCompleteness({ maxHr: 190 }, '');
    expect(result.gaps[0]).toMatchObject({
      key: 'context',
      href: '/settings/memory#memory-profile-context',
    });
  });

  it('never routes incomplete CTAs to /settings/account', () => {
    const result = getProfileCompleteness(null, null);
    expect(result.gaps.every((gap) => !gap.href.includes('/settings/account'))).toBe(true);
    expect(result.primaryHref).not.toContain('/settings/account');
  });
});
