import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginGarminMobile = vi.fn();
const loginGarminWidget = vi.fn();
const refreshDiAccessToken = vi.fn();

vi.mock('@/lib/integrations/garmin/garmin-mobile-auth', () => ({
  GarminMobileAuthError: class GarminMobileAuthError extends Error {
    constructor(
      message: string,
      public readonly kind: string,
    ) {
      super(message);
      this.name = 'GarminMobileAuthError';
    }
  },
  loginGarminMobile: (...args: unknown[]) => loginGarminMobile(...args),
}));

vi.mock('@/lib/integrations/garmin/garmin-widget-auth', () => ({
  GarminWidgetAuthError: class GarminWidgetAuthError extends Error {
    constructor(
      message: string,
      public readonly kind: string,
    ) {
      super(message);
      this.name = 'GarminWidgetAuthError';
    }
  },
  loginGarminWidget: (...args: unknown[]) => loginGarminWidget(...args),
}));

vi.mock('@/lib/integrations/garmin/garmin-di-oauth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/integrations/garmin/garmin-di-oauth')>(
    '@/lib/integrations/garmin/garmin-di-oauth',
  );
  return {
    ...actual,
    refreshDiAccessToken: (...args: unknown[]) => refreshDiAccessToken(...args),
  };
});

vi.mock('@flow-js/garmin-connect', () => {
  class GarminConnect {
    loadToken = vi.fn();
    getUserProfile = vi.fn().mockResolvedValue({ displayName: 'Athlete', fullName: 'A' });
  }
  return { GarminConnect };
});

describe('loginWithCredentials path order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses mobile SSO first and never calls widget when mobile succeeds', async () => {
    loginGarminMobile.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600_000,
      diClientId: 'GCM_ANDROID_DARK',
    });

    const { loginWithCredentials, isDiGarminTokens, diClientIdFromGarminTokens } =
      await import('@/lib/integrations/garmin/garmin');

    const result = await loginWithCredentials('user@example.com', 'pw');

    expect(loginGarminMobile).toHaveBeenCalledTimes(1);
    expect(loginGarminWidget).not.toHaveBeenCalled();
    expect(isDiGarminTokens(result.tokens)).toBe(true);
    expect(diClientIdFromGarminTokens(result.tokens)).toBe('GCM_ANDROID_DARK');
    expect(result.tokens.oauth2.access_token).toBe('access');
  });

  it('falls back to widget only when mobile is rate_limited', async () => {
    const { GarminMobileAuthError } = await import('@/lib/integrations/garmin/garmin-mobile-auth');
    loginGarminMobile.mockRejectedValue(
      new GarminMobileAuthError('Mobile login rate limited (429)', 'rate_limited'),
    );
    loginGarminWidget.mockResolvedValue({
      accessToken: 'w-access',
      refreshToken: 'w-refresh',
      expiresAt: Date.now() + 3600_000,
      diClientId: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
    });

    const { loginWithCredentials } = await import('@/lib/integrations/garmin/garmin');
    const result = await loginWithCredentials('user@example.com', 'pw');

    expect(loginGarminMobile).toHaveBeenCalled();
    expect(loginGarminWidget).toHaveBeenCalled();
    expect(result.tokens.oauth2.access_token).toBe('w-access');
  });

  it('does not call widget when mobile rejects credentials', async () => {
    const { GarminMobileAuthError } = await import('@/lib/integrations/garmin/garmin-mobile-auth');
    loginGarminMobile.mockRejectedValue(
      new GarminMobileAuthError('bad creds', 'invalid_credentials'),
    );

    const { loginWithCredentials, GarminLoginError } =
      await import('@/lib/integrations/garmin/garmin');

    await expect(loginWithCredentials('user@example.com', 'pw')).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminLoginError && err.reason === 'invalid_credentials',
    );
    expect(loginGarminWidget).not.toHaveBeenCalled();
  });
});
