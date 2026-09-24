import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFS,
  mergeNotificationPrefs,
  notificationPrefsPatchSchema,
  resolveNotificationPrefs,
  wantsMorningVerdict,
} from '@/lib/notifications/notification-prefs';

describe('notification prefs', () => {
  it('serves the defaults for nothing stored or anything unreadable', () => {
    expect(resolveNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(resolveNotificationPrefs({ version: 2 })).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(resolveNotificationPrefs('yes')).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('fills missing fields with their defaults', () => {
    expect(resolveNotificationPrefs({ version: 1, weeklyReview: false })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      weeklyReview: false,
    });
  });

  it('merges a partial PATCH without dropping the other preferences', () => {
    const stored = { ...DEFAULT_NOTIFICATION_PREFS, syncAlerts: false };
    expect(mergeNotificationPrefs(stored, { morningTime: '06:30' })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      syncAlerts: false,
      morningTime: '06:30',
    });
  });

  it('resets to the defaults on null', () => {
    expect(mergeNotificationPrefs({ version: 1, morningVerdict: false }, null)).toEqual(
      DEFAULT_NOTIFICATION_PREFS,
    );
  });

  it('validates the time and rejects unknown keys', () => {
    expect(notificationPrefsPatchSchema.safeParse({ morningTime: '6:30' }).success).toBe(false);
    expect(notificationPrefsPatchSchema.safeParse({ morningTime: '24:00' }).success).toBe(false);
    expect(notificationPrefsPatchSchema.safeParse({ marketing: true }).success).toBe(false);
    expect(notificationPrefsPatchSchema.safeParse({ morningTime: '06:30' }).success).toBe(true);
  });

  it('reads the morning verdict opt-in, on by default', () => {
    expect(wantsMorningVerdict(null)).toBe(true);
    expect(wantsMorningVerdict({ version: 1, morningVerdict: false })).toBe(false);
  });
});
