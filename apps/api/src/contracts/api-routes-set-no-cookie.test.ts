import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HANDLERS_ROOT = join('..', '..', 'packages', 'server', 'src', 'handlers');
const HANDLER_SPECIFIER = /from '@sharpit\/server\/handlers\/([^']+)'/g;
const SETS_A_COOKIE = /cookies\(\)\.set|\.cookies\.set\(|['"]set-cookie['"]/i;
/**
 * Handlers that set a cookie for the web session only, never for a Bearer request (their own
 * handler test proves it). An entry stays valid only while the file still gates on `hasBearer(`.
 */
const WEB_SESSION_ONLY_COOKIES = new Set([join(HANDLERS_ROOT, 'athlete-profile', 'handler.ts')]);

function setsACookieForApiClients(file: string): boolean {
  const source = readFileSync(file, 'utf8');
  if (!SETS_A_COOKIE.test(source)) {
    return false;
  }
  return !(WEB_SESSION_ONLY_COOKIES.has(file) && source.includes('hasBearer('));
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return routeFiles(path);
    }
    return path.endsWith('route.ts') ? [path] : [];
  });
}

/** A route file only re-exports its handler (ADR-048): read the handler it points at. */
function handlerFilesOf(routeFile: string): string[] {
  return [...readFileSync(routeFile, 'utf8').matchAll(HANDLER_SPECIFIER)].map((match) =>
    join(HANDLERS_ROOT, `${match[1]}.ts`),
  );
}

describe('api host contract', () => {
  it('no /api/v1 route or the coach stream sets a cookie', () => {
    const routes = [...routeFiles('src/app/api/v1'), 'src/app/api/coach/chat/route.ts'];
    const sources = routes.flatMap((route) => [route, ...handlerFilesOf(route)]);
    const offenders = sources.filter(setsACookieForApiClients);

    expect(routes.length).toBeGreaterThan(40);
    expect(sources.length).toBeGreaterThan(routes.length * 2 - 1);
    expect(offenders).toEqual([]);
  });
});
