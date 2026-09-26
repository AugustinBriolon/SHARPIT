import { describe, expect, it } from 'vitest';
import {
  activityNavItem,
  bottomNavItems,
  coachNavItem,
  moiNavItem,
  planNavItem,
  todayNavItem,
} from './app-navigation';

describe('app-navigation', () => {
  it('exposes five bottom tabs: Résumé · Plan · Coach · Activité · Moi', () => {
    expect(bottomNavItems.map((item) => item.label)).toEqual([
      'Résumé',
      'Plan',
      'Coach',
      'Activité',
      'Moi',
    ]);
    expect(bottomNavItems.map((item) => item.href)).toEqual([
      '/',
      '/plan',
      '/coach',
      '/activite',
      '/moi',
    ]);
  });

  it('lights Today for home, drill-downs and nutrition', () => {
    expect(todayNavItem.match('/')).toBe(true);
    expect(todayNavItem.match('/today/sleep')).toBe(true);
    expect(todayNavItem.match('/today/recovery')).toBe(true);
    expect(todayNavItem.match('/nutrition')).toBe(true);
    expect(todayNavItem.match('/plan')).toBe(false);
  });

  it('lights Plan for the hub, the week, the brief and the block-scale drill-downs', () => {
    expect(planNavItem.match('/plan')).toBe(true);
    expect(planNavItem.match('/plan/semaine')).toBe(true);
    expect(planNavItem.match('/plan/bilan')).toBe(true);
    expect(planNavItem.match('/plan/charge')).toBe(true);
    expect(planNavItem.match('/plan/adaptation')).toBe(true);
    expect(planNavItem.match('/activite')).toBe(false);
  });

  it('lights Activité for history, entry, session detail and trips', () => {
    expect(activityNavItem.match('/activite')).toBe(true);
    expect(activityNavItem.match('/activite/nouvelle')).toBe(true);
    expect(activityNavItem.match('/activite/cm123')).toBe(true);
    expect(activityNavItem.match('/activite/cm123/edit')).toBe(true);
    expect(activityNavItem.match('/activite/sejours')).toBe(true);
    expect(activityNavItem.match('/activite/sejours/trip-1')).toBe(true);
    expect(activityNavItem.match('/plan/semaine')).toBe(false);
  });

  it('lights Moi for the hub, its children and settings', () => {
    expect(moiNavItem.match('/moi')).toBe(true);
    expect(moiNavItem.match('/moi/corps')).toBe(true);
    expect(moiNavItem.match('/moi/objectifs')).toBe(true);
    expect(moiNavItem.match('/moi/calibration')).toBe(true);
    expect(moiNavItem.match('/settings/privacy')).toBe(true);
    expect(moiNavItem.match('/coach')).toBe(false);
  });

  it('lights Coach tab for /coach paths', () => {
    expect(coachNavItem.match('/coach')).toBe(true);
    expect(coachNavItem.match('/coach/abc')).toBe(true);
    expect(bottomNavItems.some((item) => item.match('/coach'))).toBe(true);
  });

  // The `/training` prefix used to hold both future organisation and completed
  // execution, so two predicates had to split it between two tabs. One prefix per
  // intention removes that: no path may be claimed twice.
  it('never lets two tabs claim the same path', () => {
    const paths = [
      '/',
      '/today/sleep',
      '/nutrition',
      '/plan',
      '/plan/semaine',
      '/plan/bilan',
      '/plan/charge',
      '/plan/adaptation',
      '/activite',
      '/activite/nouvelle',
      '/activite/cm123',
      '/activite/sejours/trip-1',
      '/moi',
      '/moi/calibration',
      '/settings/privacy',
      '/coach',
    ];

    for (const path of paths) {
      expect(bottomNavItems.filter((item) => item.match(path))).toHaveLength(1);
    }
  });
});
