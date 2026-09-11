import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type * as Ts from 'typescript';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');

const REPO_ROOT = process.cwd();
const LIB_ROOT = path.join(REPO_ROOT, 'src', 'lib');

type Violation = {
  file: string;
  kind: 'components' | 'inference';
  specifier: string;
};

/**
 * Grandfather allowlist — file → pinned `@/components/*` specifiers only.
 * A file on this list cannot add a new components import without updating the pin.
 * Do not add entries without an ADR or INTENT_MAP note. Prefer deleting over growing.
 */
const ALLOWED_LIB_TO_COMPONENTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    'src/lib/demo/demo-session-link-overlay.ts',
    new Set(['@/components/training/activity/detail/types']),
  ],
  [
    'src/lib/demo/demo-coach-transcript.ts',
    new Set(['@/components/coach/view/demo-coach-transcript']),
  ],
  [
    'src/lib/activity/detail/activity-detail-cache.ts',
    new Set([
      '@/components/training/activity/detail/activity-detail-header-content',
      '@/components/training/activity/detail/types',
    ]),
  ],
  [
    'src/lib/activity/planned-session/activity-planned-session-display.ts',
    new Set(['@/components/training/activity/detail/types']),
  ],
  [
    'src/lib/planned-session/strength/strength-prescription.test.ts',
    new Set(['@/components/planning/session/edit/strength-prescription-editor']),
  ],
  [
    'src/lib/integrations/withings/withings-ecg-display.ts',
    new Set(['@/components/corps/corps-ui']),
  ],
  ['src/lib/health/composition-metric-guides.ts', new Set(['@/components/corps/corps-ui'])],
  [
    'src/lib/coach/chat/conversations/coach-chat-known-sessions.ts',
    new Set(['@/components/coach/chat/tools/tool-activity']),
  ],
  ['src/lib/query/optimistic.ts', new Set(['@/components/ui/toast'])],
  ['src/lib/query/optimistic.test.ts', new Set(['@/components/ui/toast'])],
  [
    'src/lib/today/rich/planned-session-metrics.ts',
    new Set(['@/components/ui/instruments/session-preview-parts']),
  ],
]);

/**
 * Grandfather allowlist — file → pinned `@/core/inference/*` specifiers only.
 * Engines (`src/lib/engines/`) are the intended seam; everything else is legacy.
 */
const ALLOWED_LIB_TO_INFERENCE: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['src/lib/projection/build-projection-input.ts', new Set(['@/core/inference/environment/types'])],
  ['src/lib/projection/planning-maps.ts', new Set(['@/core/inference/environment/types'])],
  [
    'src/lib/planned-session/resolve-context.ts',
    new Set(['@/core/inference/environment/snapshot']),
  ],
  [
    'src/lib/streams/ensure-streams-for-neuromuscular.ts',
    new Set(['@/core/inference/adaptation/constants']),
  ],
  ['src/lib/sleep/sleep-scoring.ts', new Set(['@/core/inference/recovery/scoring'])],
  ['src/lib/sleep/sleep-scoring.test.ts', new Set(['@/core/inference/recovery/scoring'])],
  [
    'src/lib/presentation/environment/environment.test.ts',
    new Set(['@/core/inference/environment/types']),
  ],
  [
    'src/lib/presentation/environment/environment.ts',
    new Set(['@/core/inference/environment/types']),
  ],
  [
    'src/lib/presentation/physical-health/physical-health.ts',
    new Set(['@/core/inference/physical-health/scoring']),
  ],
  ['src/lib/scenario/compare-scenarios.ts', new Set(['@/core/inference/environment/types'])],
  [
    'src/lib/today/navigation/today-state-server.ts',
    new Set([
      '@/core/inference/adaptation-orchestrator',
      '@/core/inference/fatigue-orchestrator',
      '@/core/inference/orchestrator',
      '@/core/inference/reasoning-orchestrator',
      '@/core/inference/physical-health-orchestrator',
      '@/core/inference/environment-orchestrator',
      '@/core/inference/environment/types',
      '@/core/inference/environment/snapshot',
    ]),
  ],
]);

function isSkippableDir(name: string): boolean {
  return name === 'node_modules' || name.startsWith('.');
}

function isSourceTsFile(name: string): boolean {
  return (name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.d.ts');
}

function collectTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isSkippableDir(entry.name)) {
        out.push(...collectTsFiles(full));
      }
      continue;
    }
    if (entry.isFile() && isSourceTsFile(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isUnderEngines(rel: string): boolean {
  return rel.startsWith('src/lib/engines/') || rel === 'src/lib/engines';
}

function matchesPrefix(specifier: string, prefix: string): boolean {
  return specifier === prefix || specifier.startsWith(`${prefix}/`);
}

function specifierFromImport(node: Ts.ImportDeclaration): string | null {
  return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
}

function specifierFromExport(node: Ts.ExportDeclaration): string | null {
  const mod = node.moduleSpecifier;
  return mod && ts.isStringLiteral(mod) ? mod.text : null;
}

function specifierFromDynamicImport(node: Ts.CallExpression): string | null {
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
    return null;
  }
  const [arg0] = node.arguments;
  return arg0 && ts.isStringLiteral(arg0) ? arg0.text : null;
}

/** `vi.mock('…')` / `vi.doMock('…')` — string module id only (P3 hole close). */
function specifierFromViMock(node: Ts.CallExpression): string | null {
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return null;
  }
  const { expression: obj, name } = node.expression;
  if (!ts.isIdentifier(obj) || obj.text !== 'vi') {
    return null;
  }
  if (name.text !== 'mock' && name.text !== 'doMock') {
    return null;
  }
  const [arg0] = node.arguments;
  return arg0 && ts.isStringLiteral(arg0) ? arg0.text : null;
}

function collectImportSpecifiers(filePath: string): string[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
  const specs: string[] = [];

  const visit = (node: Ts.Node) => {
    let spec: string | null = null;
    if (ts.isImportDeclaration(node)) {
      spec = specifierFromImport(node);
    } else if (ts.isExportDeclaration(node)) {
      spec = specifierFromExport(node);
    } else if (ts.isCallExpression(node)) {
      spec = specifierFromDynamicImport(node) ?? specifierFromViMock(node);
    }
    if (spec) {
      specs.push(spec);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return specs;
}

function isAllowed(
  allowlist: ReadonlyMap<string, ReadonlySet<string>>,
  file: string,
  specifier: string,
): boolean {
  const pinned = allowlist.get(file);
  return pinned?.has(specifier) === true;
}

describe('Lib boundary guard (P2+P3)', () => {
  it('blocks new lib → components imports outside the pinned allowlist', () => {
    const violations: Violation[] = [];

    for (const filePath of collectTsFiles(LIB_ROOT)) {
      const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
      for (const specifier of collectImportSpecifiers(filePath)) {
        if (!matchesPrefix(specifier, '@/components')) {
          continue;
        }
        if (isAllowed(ALLOWED_LIB_TO_COMPONENTS, rel, specifier)) {
          continue;
        }
        violations.push({ file: rel, kind: 'components', specifier });
      }
    }

    if (violations.length > 0) {
      const message = violations.map((v) => `${v.file}: ${v.specifier}`).join('\n');
      expect(violations, `New lib→components imports:\n${message}`).toHaveLength(0);
    }

    expect(violations).toHaveLength(0);
  });

  it('blocks new lib → core/inference imports outside engines + pinned allowlist', () => {
    const violations: Violation[] = [];

    for (const filePath of collectTsFiles(LIB_ROOT)) {
      const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
      if (isUnderEngines(rel)) {
        continue;
      }
      for (const specifier of collectImportSpecifiers(filePath)) {
        if (!matchesPrefix(specifier, '@/core/inference')) {
          continue;
        }
        if (isAllowed(ALLOWED_LIB_TO_INFERENCE, rel, specifier)) {
          continue;
        }
        violations.push({ file: rel, kind: 'inference', specifier });
      }
    }

    if (violations.length > 0) {
      const message = violations.map((v) => `${v.file}: ${v.specifier}`).join('\n');
      expect(
        violations,
        `New lib→core/inference imports (use lib/engines or allowlist):\n${message}`,
      ).toHaveLength(0);
    }

    expect(violations).toHaveLength(0);
  });
});
