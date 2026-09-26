import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `@sharpit/app` is what the web may import (ADR-050): pure code, view models, the payload types
 * of `api.`, and the Clerk identity helpers. It never reaches the server package or the database
 * — not even for a type — nor back into an app.
 */
const SRC = resolve('src');
const SPECIFIER =
  /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|vi\.mock\(\s*['"]([^'"]+)['"]/g;
const FORBIDDEN = [/^@sharpit\/server(\/|$)/, /^@sharpit\/db(\/|$)/, /^@\//];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

function violationsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(SPECIFIER)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter((specifier) => {
      if (FORBIDDEN.some((pattern) => pattern.test(specifier))) {
        return true;
      }
      return specifier.startsWith('.') && !resolve(dirname(file), specifier).startsWith(`${SRC}/`);
    })
    .map((specifier) => `${relative(SRC, file)} → ${specifier}`);
}

describe('@sharpit/app boundary', () => {
  it('never imports the server package, the database or an app', () => {
    expect(sourceFiles(SRC).flatMap(violationsOf)).toEqual([]);
  });

  it('does not depend on them either', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('@sharpit/server');
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('@sharpit/db');
  });
});
