import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guard: no MobileBackLink may hard-wire empty-stack (or static) backs to a
 * route that no longer exists. Stack-aware `fallbackHref` to a current hub is
 * fine; static `href=` is allowlisted.
 */

const REPO_ROOT = process.cwd();
const SRC_ROOT = path.join(REPO_ROOT, 'src');

/** Static `href`+`label` backs that intentionally bypass the stack. */
const STATIC_HREF_ALLOWLIST = new Set([
  // Transient edit → parent séance (replace).
  'src/app/(app)/activite/[id]/edit/page.tsx',
  // Garmin SSO returnTo (integrations or onboarding).
  'src/components/settings/integrations/garmin-browser-sso-client.tsx',
]);

/**
 * Every route deleted by the Plan/Activité split. Listed as prefixes so a back
 * link cannot point at a child of a removed surface either. `/settings` is the
 * bare hub only — its children (account, privacy, …) are still live.
 */
const REMOVED_ROUTES = [
  '/training',
  '/progress',
  '/biology',
  '/settings/goals',
  '/settings/calibration',
  '/today/effort',
  '/today/adaptation',
];

const FORBIDDEN_FALLBACK = new RegExp(
  String.raw`fallbackHref\s*=\s*\{?\s*["'\`](` +
    `${REMOVED_ROUTES.map((route) => `${route}(?:[/?][^"'\`]*)?`).join('|')}` +
    String.raw`|/settings(?:\?[^"'\`]*)?)["'\`]`,
);
const STATIC_HREF_PROP = /<MobileBackLink\b[^>]*\bhref\s*=/;

function shouldSkipDir(name: string): boolean {
  return name === 'node_modules' || name.startsWith('.');
}

function isSourceTsFile(name: string): boolean {
  return /\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts');
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkipDir(entry.name)) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(abs, out);
      continue;
    }
    if (isSourceTsFile(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function toRel(abs: string): string {
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
}

describe('back-navigation inventory', () => {
  const files = walkTsFiles(SRC_ROOT);

  it('forbids fallbackHref to any route removed by the Plan/Activité split', () => {
    const violations: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      const source = fs.readFileSync(abs, 'utf8');
      if (FORBIDDEN_FALLBACK.test(source)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('allowlists the only static MobileBackLink href= call sites', () => {
    const found: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      const source = fs.readFileSync(abs, 'utf8');
      if (!source.includes('MobileBackLink')) {
        continue;
      }
      if (STATIC_HREF_PROP.test(source)) {
        found.push(rel);
      }
    }
    expect(found.sort()).toEqual([...STATIC_HREF_ALLOWLIST].sort());
  });

  it('does not hard-push deleted activities to a removed hub', () => {
    const detailActions = fs.readFileSync(
      path.join(
        SRC_ROOT,
        'components/training/activity/detail/use-activity-detail-header-actions.ts',
      ),
      'utf8',
    );
    const listActions = fs.readFileSync(
      path.join(SRC_ROOT, 'components/training/activity/list/activity-list.tsx'),
      'utf8',
    );
    expect(detailActions).not.toMatch(/router\.push\(\s*['"`]\/training['"`]\s*\)/);
    expect(detailActions).not.toMatch(/router\.push\(\s*['"`]\/training\/history/);
    expect(listActions).not.toMatch(/router\.push\(\s*['"`]\/training['"`]\s*\)/);
    expect(detailActions).toMatch(/\/activite/);
    expect(listActions).toMatch(/\/activite/);
  });

  /**
   * The removed routes have no redirect stub, so a leftover reference is a dead
   * link rather than a detour. Nothing in the app may name one — which is what
   * makes the deletion safe to do without redirects.
   */
  it('leaves no reference to a removed route anywhere in the app', () => {
    const routeLiteral = new RegExp(
      String.raw`["'\`](` +
        `${REMOVED_ROUTES.map((route) => `${route}(?:[/?][^"'\`]*)?`).join('|')}` +
        String.raw`)["'\`]`,
    );
    const violations: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      // The nav tests assert these routes are gone, so they must name them.
      if (rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) {
        continue;
      }
      if (routeLiteral.test(fs.readFileSync(abs, 'utf8'))) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps legal walls free of MobileBackLink / app shell back chrome', () => {
    const legalTrees = [
      'src/app/consent/',
      'src/app/privacy/',
      'src/app/terms/',
      'src/components/privacy/',
    ];
    const violations: string[] = [];
    for (const abs of files) {
      const rel = toRel(abs);
      if (!legalTrees.some((prefix) => rel.startsWith(prefix))) {
        continue;
      }
      const source = fs.readFileSync(abs, 'utf8');
      if (source.includes('MobileBackLink') || source.includes('mobile-back-link')) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});
