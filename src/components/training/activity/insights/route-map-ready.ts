let routeMapInnerReady = false;

export function isRouteMapInnerReady(): boolean {
  return routeMapInnerReady;
}

export function markRouteMapInnerReady(): void {
  routeMapInnerReady = true;
}

export function resetRouteMapInnerReadyForTests(): void {
  routeMapInnerReady = false;
}

/** Cached path + warmed chunk → paint the map, never a second skeleton. */
export function shouldDeferRouteMapMount(innerReady: boolean): boolean {
  return !innerReady;
}
