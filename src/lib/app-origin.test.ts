import { afterEach, describe, expect, it, vi } from 'vitest';
import { appOrigin } from '@/lib/app-origin';

describe('appOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers NEXT_PUBLIC_APP_URL over the request origin', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sharpit.app/');
    expect(appOrigin('https://preview.example')).toBe('https://sharpit.app');
  });

  it('falls back to the request origin when unset', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(appOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });
});
