import { describe, expect, it } from 'vitest';
import {
  activityNavItem,
  bottomNavItems,
  coachNavItem,
  isActivityTrainingPath,
  isPlanTrainingPath,
  moiNavItem,
  planNavItem,
  sidebarPrimaryNavItems,
  todayNavItem,
} from './app-navigation';

describe('app-navigation Shell V1', () => {
  it('exposes exactly four bottom tabs: Aujourd’hui · Plan · Activité · Moi', () => {
    expect(bottomNavItems.map((item) => item.label)).toEqual([
      'Aujourd’hui',
      'Plan',
      'Activité',
      'Moi',
    ]);
    expect(bottomNavItems.map((item) => item.href)).toEqual(['/', '/plan', '/activite', '/moi']);
  });

  it('keeps Coach out of primary bottom and sidebar nav', () => {
    expect(bottomNavItems).not.toContainEqual(coachNavItem);
    expect(sidebarPrimaryNavItems.map((item) => item.href)).not.toContain('/coach');
    expect(coachNavItem.href).toBe('/coach');
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

  it('does not light any primary tab for Coach (contextual only)', () => {
    const pathname = '/coach';
    expect(bottomNavItems.some((item) => item.match(pathname))).toBe(false);
    expect(coachNavItem.match(pathname)).toBe(true);
  });
});
