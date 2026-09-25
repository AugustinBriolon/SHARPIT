import { afterEach, describe, expect, it } from 'vitest';
import {
  isRouteMapInnerReady,
  markRouteMapInnerReady,
  resetRouteMapInnerReadyForTests,
  shouldDeferRouteMapMount,
} from './route-map-ready';

describe('route-map-ready', () => {
  afterEach(() => {
    resetRouteMapInnerReadyForTests();
  });

  it('defers the first mount and keeps later mounts instant', () => {
    expect(shouldDeferRouteMapMount(isRouteMapInnerReady())).toBe(true);
    markRouteMapInnerReady();
    expect(shouldDeferRouteMapMount(isRouteMapInnerReady())).toBe(false);
  });
});
