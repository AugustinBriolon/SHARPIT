import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ADR-048 phase 3f / ADR-050: the web reads and writes through `api.`, and takes its shared code
 * from `@sharpit/app`. It never imports the server package or the database — not even a type.
 */
const ROOTS = ['src', 'scripts', 'e2e'];
const SPECIFIER =
  /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|vi\.mock\(\s*['"]([^'"]+)['"]/g;
const FORBIDDEN = /^@sharpit\/(server|db)(\/|$)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(tsx?|mjs)$/.test(entry) ? [path] : [];
  });
}

describe('web without the server', () => {
  it('imports neither @sharpit/server nor @sharpit/db', () => {
    const offenders = ROOTS.filter((root) => {
      try {
        return statSync(root).isDirectory();
      } catch {
        return false;
      }
    })
      .flatMap(sourceFiles)
      .flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
          .map((match) => match[1] ?? match[2] ?? match[3])
          .filter((specifier) => FORBIDDEN.test(specifier))
          .map((specifier) => `${file} → ${specifier}`),
      );
    expect(offenders).toEqual([]);
  });

  it('does not depend on them either', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('@sharpit/server');
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('@sharpit/db');
  });
});
