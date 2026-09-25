import { describe, expect, it } from 'vitest';
import {
  downsamplePath,
  extractRoutePreviewPath,
  extractRoutePreviewPathFromLatLng,
  ROUTE_PREVIEW_MAX_POINTS,
} from '@/lib/streams/route-previews';

describe('extractRoutePreviewPath', () => {
  it('returns null when latlng is missing or too short', () => {
    expect(extractRoutePreviewPath(null)).toBeNull();
    expect(extractRoutePreviewPath({})).toBeNull();
    expect(extractRoutePreviewPath({ latlng: [[48.8, 2.3]] })).toBeNull();
  });

  it('keeps short paths intact', () => {
    const path: [number, number][] = [
      [48.8, 2.3],
      [48.81, 2.31],
      [48.82, 2.32],
    ];
    expect(extractRoutePreviewPath({ latlng: path })).toEqual(path);
  });

  it('downsamples long paths to the preview budget', () => {
    const latlng = Array.from(
      { length: 500 },
      (_, i) => [48 + i * 0.001, 2 + i * 0.001] as [number, number],
    );
    const preview = extractRoutePreviewPath({ latlng });
    expect(preview).not.toBeNull();
    expect(preview!.length).toBeLessThanOrEqual(ROUTE_PREVIEW_MAX_POINTS + 1);
    expect(preview![0]).toEqual(latlng[0]);
    expect(preview![preview!.length - 1]).toEqual(latlng[latlng.length - 1]);
  });

  it('builds a preview from a bare latlng array', () => {
    const path: [number, number][] = [
      [48.8, 2.3],
      [48.81, 2.31],
    ];
    expect(extractRoutePreviewPathFromLatLng(path)).toEqual(path);
    expect(extractRoutePreviewPathFromLatLng(null)).toBeNull();
  });
});

describe('downsamplePath', () => {
  it('returns the same array when already under the cap', () => {
    const path: [number, number][] = [
      [1, 1],
      [2, 2],
    ];
    expect(downsamplePath(path, 10)).toEqual(path);
  });
});
