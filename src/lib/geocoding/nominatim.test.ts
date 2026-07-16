import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { searchPlaces } from './nominatim';

describe('searchPlaces', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('does not restrict the Nominatim query to a specific country', async () => {
    await searchPlaces('Sollenkroka, Suède');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [[requestedUrl]] = fetchMock.mock.calls;
    const url = new URL(String(requestedUrl));
    expect(url.searchParams.has('countrycodes')).toBe(false);
    expect(url.searchParams.get('q')).toBe('Sollenkroka, Suède');
  });
});
