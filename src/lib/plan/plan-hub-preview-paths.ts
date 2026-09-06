type RememberedHubRoute = {
  known: boolean;
  hasPath: boolean;
  path: [number, number][] | null;
};

const rememberedRoutes = new Map<string, [number, number][] | null>();

export function rememberHubRoute(activityId: string, path: [number, number][] | null): void {
  rememberedRoutes.set(activityId, path);
}

export function readRememberedHubRoute(activityId: string): RememberedHubRoute {
  if (!rememberedRoutes.has(activityId)) {
    return { known: false, hasPath: false, path: null };
  }
  const path = rememberedRoutes.get(activityId) ?? null;
  return { known: true, hasPath: path !== null, path };
}

export function resetRememberedHubRoutesForTests(): void {
  rememberedRoutes.clear();
}
