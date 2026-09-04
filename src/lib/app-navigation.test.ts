import { describe, expect, it } from 'vitest';
import {
  activityNavItem,
  bottomNavItems,
  coachNavItem,
  isActivityTrainingPath,
  isPlanTrainingPath,
  moiNavItem,
  planNavItem,
  todayNavItem,
} from './app-navigation';

describe('app-navigation Shell V1', () => {
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
    expect(todayNavItem.match('/nutrition')).toBe(true);
    expect(todayNavItem.match('/plan')).toBe(false);
  });

  it('splits /training between Plan and Activité', () => {
    expect(isPlanTrainingPath('/training')).toBe(true);
    expect(isPlanTrainingPath('/training/planning')).toBe(true);
    expect(isPlanTrainingPath('/training/weekly-review')).toBe(true);
    expect(isActivityTrainingPath('/training/history')).toBe(true);
    expect(isActivityTrainingPath('/training/trips')).toBe(true);
    expect(isActivityTrainingPath('/training/manual')).toBe(true);
    expect(isActivityTrainingPath('/training/cm123')).toBe(true);
    expect(isActivityTrainingPath('/training/cm123/edit')).toBe(true);

    expect(planNavItem.match('/plan')).toBe(true);
    expect(planNavItem.match('/training')).toBe(true);
    expect(planNavItem.match('/training/history')).toBe(false);
    expect(activityNavItem.match('/activite')).toBe(true);
    expect(activityNavItem.match('/training/history')).toBe(true);
    expect(activityNavItem.match('/training')).toBe(false);
  });

  it('lights Moi for profile hubs, settings, progress and biology', () => {
    expect(moiNavItem.match('/moi')).toBe(true);
    expect(moiNavItem.match('/moi/corps')).toBe(true);
    expect(moiNavItem.match('/moi/objectifs')).toBe(true);
    expect(moiNavItem.match('/settings')).toBe(true);
    expect(moiNavItem.match('/settings/privacy')).toBe(true);
    expect(moiNavItem.match('/progress')).toBe(true);
    expect(moiNavItem.match('/biology')).toBe(true);
    expect(moiNavItem.match('/coach')).toBe(false);
  });

  it('lights Coach tab for /coach paths', () => {
    expect(coachNavItem.match('/coach')).toBe(true);
    expect(coachNavItem.match('/coach/abc')).toBe(true);
    expect(bottomNavItems.some((item) => item.match('/coach'))).toBe(true);
  });
});
