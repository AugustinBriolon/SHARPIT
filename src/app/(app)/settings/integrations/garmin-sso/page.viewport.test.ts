import { describe, expect, it } from 'vitest';
import { viewport } from '@/app/(app)/settings/integrations/garmin-sso/page';

describe('garmin-sso page viewport', () => {
  it('caps maximumScale on this route only to stop iOS focus-zoom', () => {
    expect(viewport.maximumScale).toBe(1);
    expect(viewport.initialScale).toBe(1);
    expect(viewport.width).toBe('device-width');
  });
});
