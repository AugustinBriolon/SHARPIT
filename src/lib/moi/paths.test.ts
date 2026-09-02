import { describe, expect, it } from 'vitest';
import {
  MOI_CORPS_PATH,
  MOI_OBJECTIFS_PATH,
  MOI_PERFORMANCE_PATH,
  resolveProgressLegacyRedirect,
} from '@/lib/moi/paths';

describe('resolveProgressLegacyRedirect', () => {
  it('sends body tab to Corps', () => {
    expect(resolveProgressLegacyRedirect({ tab: 'body' })).toBe(MOI_CORPS_PATH);
  });

  it('sends performance tab to Performance, preserving sport filter', () => {
    expect(resolveProgressLegacyRedirect({ tab: 'performance' })).toBe(MOI_PERFORMANCE_PATH);
    expect(resolveProgressLegacyRedirect({ tab: 'performance', sport: 'bike' })).toBe(
      `${MOI_PERFORMANCE_PATH}?sport=bike`,
    );
  });

  it('defaults goals / unknown / empty to Objectifs', () => {
    expect(resolveProgressLegacyRedirect({ tab: 'goals' })).toBe(MOI_OBJECTIFS_PATH);
    expect(resolveProgressLegacyRedirect({})).toBe(MOI_OBJECTIFS_PATH);
    expect(resolveProgressLegacyRedirect({ tab: 'nope' })).toBe(MOI_OBJECTIFS_PATH);
  });
});
