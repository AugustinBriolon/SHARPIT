import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getViewer = vi.fn();

vi.mock('@/server/viewer', () => ({ getViewer }));

describe('GET /start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('redirects straight to the athlete’s next screen, uncached', async () => {
    getViewer.mockResolvedValue({ entryPath: '/onboarding' });
    const { GET } = await import('./route');

    const response = await GET(new NextRequest('https://sharpit.app/start'));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://sharpit.app/onboarding');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('falls back to Today when the athlete cannot be resolved', async () => {
    getViewer.mockRejectedValue(new Error('api. down'));
    const { GET } = await import('./route');

    const response = await GET(new NextRequest('https://sharpit.app/start'));
    expect(response.headers.get('location')).toBe('https://sharpit.app/');
  });
});
