import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Liquid-glass must stay on chrome shells only.
 * Never on legal walls or Confidentialité content surfaces.
 */
const REPO_ROOT = process.cwd();
const SRC_ROOT = path.join(REPO_ROOT, 'src');

const LIQUID_GLASS_IMPORT =
  /from\s+['"]liquid-glass-react['"]|require\(\s*['"]liquid-glass-react['"]\s*\)/;
const CHROME_GLASS_IMPORT = /from\s+['"]@\/components\/chrome\/chrome-glass['"]/;

/** Sole module allowed to import the npm package. */
const LIQUID_GLASS_ALLOWED = new Set(['src/components/chrome/chrome-glass.tsx']);

/** Call sites allowed to wrap chrome with `ChromeGlass`. */
const CHROME_GLASS_ALLOWED = new Set([
  'src/components/layout/mobile-shell.tsx',
  'src/components/layout/mobile-back-link.tsx',
]);

const FORBIDDEN_DIR_PREFIXES = [
  'src/app/consent/',
  'src/app/privacy/',
  'src/app/terms/',
  'src/app/(app)/settings/privacy/',
  'src/components/privacy/',
];

function isSkippableDirEntry(entry: fs.Dirent): boolean {
  return entry.name === 'node_modules' || entry.name.startsWith('.');
}

function isTsSourceFile(entry: fs.Dirent): boolean {
  return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts');
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isSkippableDirEntry(entry)) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(abs, out);
      continue;
    }
    if (isTsSourceFile(entry)) {
      out.push(abs);
    }
  }
  return out;
}

function toRel(abs: string): string {
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
}

describe('chrome liquid-glass scope', () => {
  const files = walkTsFiles(SRC_ROOT);

  it('pins liquid-glass-react to an exact version in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      resolutions?: Record<string, string>;
    };
    expect(pkg.dependencies?.['liquid-glass-react']).toBe('1.1.1');
    expect(pkg.resolutions?.['liquid-glass-react']).toBe('1.1.1');
  });

  it('imports liquid-glass-react only from ChromeGlass wrapper', () => {
    const violations: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      const source = fs.readFileSync(abs, 'utf8');
      if (!LIQUID_GLASS_IMPORT.test(source)) {
        continue;
      }
      if (!LIQUID_GLASS_ALLOWED.has(rel)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('imports ChromeGlass only from allowed chrome call sites', () => {
    const violations: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      const source = fs.readFileSync(abs, 'utf8');
      if (!CHROME_GLASS_IMPORT.test(source)) {
        continue;
      }
      if (!CHROME_GLASS_ALLOWED.has(rel)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('never places ChromeGlass / liquid-glass under legal or Confidentialité trees', () => {
    const violations: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      if (!FORBIDDEN_DIR_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
        continue;
      }
      const source = fs.readFileSync(abs, 'utf8');
      if (LIQUID_GLASS_IMPORT.test(source) || CHROME_GLASS_IMPORT.test(source)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});
