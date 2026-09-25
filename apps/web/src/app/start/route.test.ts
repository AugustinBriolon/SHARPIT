import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentAthleteId = vi.fn();
const athleteEntryPath = vi.fn();

vi.mock('@/lib/auth/current-athlete', () => ({ getCurrentAthleteId }));
vi.mock('@/lib/onboarding/entry', () => ({ athleteEntryPath }));

describe('GET /start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('redirects straight to the athlete’s next screen, uncached', async () => {
    getCurrentAthleteId.mockResolvedValue('athlete-1');
    athleteEntryPath.mockResolvedValue('/onboarding');
    const { GET } = await import('./route');

    const response = await GET(new NextRequest('https://sharpit.app/start'));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://sharpit.app/onboarding');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('falls back to Today when the athlete cannot be resolved', async () => {
    getCurrentAthleteId.mockRejectedValue(new Error('boom'));
    const { GET } = await import('./route');

    const response = await GET(new NextRequest('https://sharpit.app/start'));
    expect(response.headers.get('location')).toBe('https://sharpit.app/');
  });
});
