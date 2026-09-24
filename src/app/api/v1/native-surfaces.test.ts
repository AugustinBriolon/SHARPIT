import { describe, expect, it } from 'vitest';
import { NATIVE_V1_DEFERRED, NATIVE_V1_SURFACES } from '@/lib/api-v1/native-surfaces';

type RouteModule = Record<string, unknown>;

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type RouteLoaders = Record<string, () => Promise<RouteModule>>;

// Lazy: only the modules a test asks for are loaded.
const v1Routes = import.meta.glob('./**/route.ts') as RouteLoaders;
const legacyRoutes = import.meta.glob('../**/route.ts') as RouteLoaders;

async function load(routes: RouteLoaders, key: string): Promise<RouteModule> {
  const loader = routes[key];
  if (!loader) {
    throw new Error(`missing route module ${key}`);
  }
  return loader();
}

describe('/api/v1 native surfaces', () => {
  it.each(NATIVE_V1_SURFACES)('/api/v1/$path serves the /api handler', async (surface) => {
    const v1 = await load(v1Routes, `./${surface.path}/route.ts`);
    const legacy = await load(legacyRoutes, `../${surface.path}/route.ts`);

    const exported = HTTP_METHODS.filter((method) => method in v1);
    expect(exported).toEqual([...surface.methods].sort(byHttpOrder));
    for (const method of surface.methods) {
      expect(v1[method]).toBe(legacy[method]);
    }
    expect(v1.maxDuration).toBe(legacy.maxDuration);
  });

  it.each(NATIVE_V1_DEFERRED)('/api/v1/%s stays off the native contract', (path) => {
    expect(v1Routes[`./${path}/route.ts`]).toBeUndefined();
  });
});

function byHttpOrder(a: string, b: string): number {
  return HTTP_METHODS.indexOf(a) - HTTP_METHODS.indexOf(b);
}
