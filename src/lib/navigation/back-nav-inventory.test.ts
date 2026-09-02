import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guard: no MobileBackLink may hard-wire empty-stack (or static) backs to the
 * obsolete hubs Historique / Progression / Settings root. Stack-aware
 * `fallbackHref` to Shell V1 hubs is fine; static `href=` is allowlisted.
 */

const REPO_ROOT = process.cwd();
const SRC_ROOT = path.join(REPO_ROOT, 'src');

/** Static `href`+`label` backs that intentionally bypass the stack. */
const STATIC_HREF_ALLOWLIST = new Set([
  // Transient edit → parent séance (replace).
  'src/app/(app)/training/[id]/edit/page.tsx',
  // Garmin SSO returnTo (integrations or onboarding).
  'src/components/settings/integrations/garmin-browser-sso-client.tsx',
]);

const FORBIDDEN_FALLBACK =
  /fallbackHref\s*=\s*\{?\s*["'`](\/training\/history|\/progress(?:\?[^"'`]*)?|\/settings)["'`]/;
const STATIC_HREF_PROP = /<MobileBackLink\b[^>]*\bhref\s*=/;

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(abs, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
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

  it('forbids fallbackHref to Historique / Progression / Settings root', () => {
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

    it('does not hard-push deleted activities to Fil / Historique', () => {
      const detailActions = fs.readFileSync(
        path.join(SRC_ROOT, 'components/training/activity/detail/use-activity-detail-header-actions.ts'),
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
