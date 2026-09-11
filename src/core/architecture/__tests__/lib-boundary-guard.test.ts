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
 * Grandfather allowlist — existing inversions documented by architecture review.
 * Do not add entries without an ADR or an intentional exception comment in INTENT_MAP.
 * Prefer deleting from this list over growing it.
 */
const ALLOWED_LIB_TO_COMPONENTS: ReadonlySet<string> = new Set([
  'src/lib/demo/demo-session-link-overlay.ts',
  'src/lib/demo/demo-coach-transcript.ts',
  'src/lib/activity/detail/activity-detail-cache.ts',
  'src/lib/activity/planned-session/activity-planned-session-display.ts',
  'src/lib/planned-session/strength/strength-prescription.test.ts',
  'src/lib/integrations/withings/withings-ecg-display.ts',
  'src/lib/health/composition-metric-guides.ts',
  'src/lib/coach/chat/conversations/coach-chat-known-sessions.ts',
  'src/lib/query/optimistic.ts',
  'src/lib/today/rich/planned-session-metrics.ts',
]);

/**
 * Grandfather allowlist for value/type imports of `@/core/inference` from `src/lib`
 * outside `src/lib/engines/`. Engines are the intended seam; everything else is legacy.
 */
const ALLOWED_LIB_TO_INFERENCE: ReadonlySet<string> = new Set([
  'src/lib/projection/build-projection-input.ts',
  'src/lib/projection/planning-maps.ts',
  'src/lib/planned-session/resolve-context.ts',
  'src/lib/streams/ensure-streams-for-neuromuscular.ts',
  'src/lib/sleep/sleep-scoring.ts',
  'src/lib/sleep/sleep-scoring.test.ts',
  'src/lib/presentation/environment/environment.test.ts',
  'src/lib/presentation/environment/environment.ts',
  'src/lib/presentation/physical-health/physical-health.ts',
  'src/lib/scenario/compare-scenarios.ts',
  'src/lib/today/navigation/today-state-server.ts',
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
      spec = specifierFromDynamicImport(node);
    }
    if (spec) {
      specs.push(spec);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return specs;
}

describe('Lib boundary guard (P2)', () => {
  it('blocks new lib → components imports outside the allowlist', () => {
    const violations: Violation[] = [];

    for (const filePath of collectTsFiles(LIB_ROOT)) {
      const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
      for (const specifier of collectImportSpecifiers(filePath)) {
        if (!matchesPrefix(specifier, '@/components')) {
          continue;
        }
        if (ALLOWED_LIB_TO_COMPONENTS.has(rel)) {
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

  it('blocks new lib → core/inference imports outside engines + allowlist', () => {
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
        if (ALLOWED_LIB_TO_INFERENCE.has(rel)) {
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
