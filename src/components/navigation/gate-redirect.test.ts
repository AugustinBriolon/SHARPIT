import { describe, expect, it } from 'vitest';
import { isGateExempt } from '@/components/navigation/gate-redirect';

describe('isGateExempt', () => {
  const exempt = ['/settings/integrations/garmin-sso'];

  it('exempts the page itself', () => {
    expect(isGateExempt('/settings/integrations/garmin-sso', exempt)).toBe(true);
  });

  it('does not exempt siblings or look-alikes', () => {
    expect(isGateExempt('/settings/integrations', exempt)).toBe(false);
    expect(isGateExempt('/settings/integrations/garmin-sso-other', exempt)).toBe(false);
    expect(isGateExempt('/', exempt)).toBe(false);
  });

  it('exempts nothing by default', () => {
    expect(isGateExempt('/settings/integrations/garmin-sso', [])).toBe(false);
  });
});
