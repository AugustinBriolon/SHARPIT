import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type * as Ts from 'typescript';

// Important: use Node's resolver at runtime so Vite doesn't try to parse/transform
// `node_modules/typescript/lib/typescript.js` during import-analysis.
const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');

type Violation = {
  file: string;
  kind: 'import' | 'export' | 'dynamic-import' | 'require' | 'side-effect-import';
  specifier: string;
  forbiddenReason: string;
};

const REPO_ROOT = process.cwd();

const PRESENTATION_ROOTS: Array<{ dir: string; isExcluded: (relPath: string) => boolean }> = [
  {
    dir: path.join(REPO_ROOT, 'src', 'components'),
    isExcluded: () => false,
  },
  {
    dir: path.join(REPO_ROOT, 'src', 'hooks'),
    isExcluded: () => false,
  },
  {
    dir: path.join(REPO_ROOT, 'src', 'app'),
    isExcluded: (relPath) => relPath.startsWith('src/app/api/'),
  },
];

const FORBIDDEN_ALIASES = {
  inference: '@/core/inference',
  digitalTwin: '@/core/digital-twin',
  featureEngine: '@/core/features',
  observationEngine: '@/core/observation',
  featureOrInferenceEnginesSingletons: '@/lib/engines',
  productInsightBuilders: '@/core/product-insight',
  productInsightProjections: '@/lib/product-insight',
} as const;

const ALLOWED_PRODUCT_INSIGHT_TYPES = '@/core/product-insight/types';

function matchesPrefix(specifier: string, prefix: string): boolean {
  return specifier === prefix || specifier.startsWith(`${prefix}/`);
}

function isForbiddenBySpecifier(specifier: string): string | null {
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.inference)) {
    return 'inference';
  }
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.digitalTwin)) {
    return 'digital-twin';
  }
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.featureEngine)) {
    return 'feature-engine';
  }
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.observationEngine)) {
    return 'observation-engine';
  }
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.featureOrInferenceEnginesSingletons)) {
    return 'engines';
  }
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.productInsightProjections)) {
    return 'product-insight-projections';
  }
  if (matchesPrefix(specifier, FORBIDDEN_ALIASES.productInsightBuilders)) {
    if (specifier === ALLOWED_PRODUCT_INSIGHT_TYPES) return null;
    return 'product-insight-builders';
  }
  return null;
}

function isImportDeclarationTypeOnly(node: Ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  // Side-effect import: `import 'x'`.
  if (!clause) return false;
  if (clause.isTypeOnly) return true;

  // TS supports `import { type X } from '...'`.
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    return clause.namedBindings.elements.every(
      (e: Ts.ImportSpecifier) =>
        (e as Ts.ImportSpecifier & { isTypeOnly?: boolean }).isTypeOnly === true,
    );
  }
  return false;
}

function collectTsFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Avoid traversing node_modules even if it appears under roots.
      if (entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
      out.push(...collectTsFiles(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function resolveToRepoAbsPath(importerFilePath: string, specifier: string): string | null {
  // Handle TS path alias `@/...` and relative imports.
  let absBase: string;
  if (specifier.startsWith('@/')) {
    absBase = path.join(REPO_ROOT, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    absBase = path.resolve(path.dirname(importerFilePath), specifier);
  } else {
    return null;
  }

  const candidates = [
    absBase,
    `${absBase}.ts`,
    `${absBase}.tsx`,
    `${absBase}.mts`,
    `${absBase}.d.ts`,
    path.join(absBase, 'index.ts'),
    path.join(absBase, 'index.tsx'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function isForbiddenByResolvedPath(resolvedAbsPath: string): string | null {
  // Only needed when specifier isn't an alias we can match reliably.
  const allowedProductInsightTypesResolved = path.join(
    REPO_ROOT,
    'src',
    'core',
    'product-insight',
    'types.ts',
  );
  if (resolvedAbsPath === allowedProductInsightTypesResolved) return null;

  const forbiddenPrefixesAbs = [
    path.join(REPO_ROOT, 'src', 'core', 'inference'),
    path.join(REPO_ROOT, 'src', 'core', 'digital-twin'),
    path.join(REPO_ROOT, 'src', 'core', 'features'),
    path.join(REPO_ROOT, 'src', 'core', 'observation'),
    path.join(REPO_ROOT, 'src', 'lib', 'engines'),
    path.join(REPO_ROOT, 'src', 'core', 'product-insight'),
    path.join(REPO_ROOT, 'src', 'lib', 'product-insight'),
  ];

  for (const p of forbiddenPrefixesAbs) {
    if (resolvedAbsPath === p || resolvedAbsPath.startsWith(`${p}${path.sep}`)) {
      // Split message category for better UX.
      if (p.includes(`${path.sep}core${path.sep}product-insight`))
        return 'product-insight-builders';
      if (p.includes(`${path.sep}lib${path.sep}product-insight`))
        return 'product-insight-projections';
      if (p.includes(`${path.sep}lib${path.sep}engines`)) return 'engines';
      if (p.includes(`${path.sep}core${path.sep}inference`)) return 'inference';
      if (p.includes(`${path.sep}core${path.sep}digital-twin`)) return 'digital-twin';
      if (p.includes(`${path.sep}core${path.sep}features`)) return 'feature-engine';
      if (p.includes(`${path.sep}core${path.sep}observation`)) return 'observation-engine';
      return 'forbidden-module';
    }
  }

  return null;
}

function collectViolationsInFile(filePath: string): Violation[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);

  const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
  const violations: Violation[] = [];

  const visit = (node: Ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const specifierNode = node.moduleSpecifier;
      if (specifierNode && ts.isStringLiteral(specifierNode)) {
        const specifier = specifierNode.text;
        const forbiddenReason = isForbiddenBySpecifier(specifier);
        const isTypeOnly = isImportDeclarationTypeOnly(node);
        const isValueImport = !isTypeOnly;

        // `import 'x'` is always a value/side-effect import.
        const isSideEffectImport = node.importClause == null;
        const kind: Violation['kind'] = isSideEffectImport ? 'side-effect-import' : 'import';

        if (forbiddenReason && isValueImport) {
          violations.push({
            file: rel,
            kind,
            specifier,
            forbiddenReason,
          });
        } else if (!forbiddenReason && isValueImport) {
          // Fallback for relative imports: resolve and check physical path.
          const resolvedAbs = resolveToRepoAbsPath(filePath, specifier);
          if (resolvedAbs) {
            const forbiddenByResolved = isForbiddenByResolvedPath(resolvedAbs);
            if (forbiddenByResolved) {
              violations.push({
                file: rel,
                kind,
                specifier,
                forbiddenReason: forbiddenByResolved,
              });
            }
          }
        }
      }
    }

    if (ts.isExportDeclaration(node)) {
      const { moduleSpecifier } = node;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const specifier = moduleSpecifier.text;
        // `export type { X } from '...'` => node.isTypeOnly is true.
        const isTypeOnly =
          (node as Ts.ExportDeclaration & { isTypeOnly?: boolean }).isTypeOnly === true;
        if (!isTypeOnly) {
          const forbiddenReason = isForbiddenBySpecifier(specifier);
          if (forbiddenReason) {
            violations.push({
              file: rel,
              kind: 'export',
              specifier,
              forbiddenReason,
            });
          } else {
            const resolvedAbs = resolveToRepoAbsPath(filePath, specifier);
            if (resolvedAbs) {
              const forbiddenByResolved = isForbiddenByResolvedPath(resolvedAbs);
              if (forbiddenByResolved) {
                violations.push({
                  file: rel,
                  kind: 'export',
                  specifier,
                  forbiddenReason: forbiddenByResolved,
                });
              }
            }
          }
        }
      }
    }

    // import('...')
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const args = node.arguments;
      const [arg0] = args;
      if (arg0 && ts.isStringLiteral(arg0)) {
        const specifier = arg0.text;
        const forbiddenReason = isForbiddenBySpecifier(specifier);
        if (forbiddenReason) {
          violations.push({
            file: rel,
            kind: 'dynamic-import',
            specifier,
            forbiddenReason,
          });
        } else {
          const resolvedAbs = resolveToRepoAbsPath(filePath, specifier);
          if (resolvedAbs) {
            const forbiddenByResolved = isForbiddenByResolvedPath(resolvedAbs);
            if (forbiddenByResolved) {
              violations.push({
                file: rel,
                kind: 'dynamic-import',
                specifier,
                forbiddenReason: forbiddenByResolved,
              });
            }
          }
        }
      }
    }

    // require('...')
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require'
    ) {
      const args = node.arguments;
      const [arg0] = args;
      if (arg0 && ts.isStringLiteral(arg0)) {
        const specifier = arg0.text;
        const forbiddenReason = isForbiddenBySpecifier(specifier);
        if (forbiddenReason) {
          violations.push({
            file: rel,
            kind: 'require',
            specifier,
            forbiddenReason,
          });
        } else {
          const resolvedAbs = resolveToRepoAbsPath(filePath, specifier);
          if (resolvedAbs) {
            const forbiddenByResolved = isForbiddenByResolvedPath(resolvedAbs);
            if (forbiddenByResolved) {
              violations.push({
                file: rel,
                kind: 'require',
                specifier,
                forbiddenReason: forbiddenByResolved,
              });
            }
          }
        }
      }
    }

    // import x = require('...')
    if (ts.isImportEqualsDeclaration(node)) {
      const moduleRef = node.moduleReference;
      if (
        moduleRef &&
        ts.isExternalModuleReference(moduleRef) &&
        moduleRef.expression &&
        ts.isStringLiteral(moduleRef.expression)
      ) {
        const specifier = moduleRef.expression.text;
        const forbiddenReason = isForbiddenBySpecifier(specifier);
        if (forbiddenReason) {
          violations.push({
            file: rel,
            kind: 'import',
            specifier,
            forbiddenReason,
          });
        } else {
          const resolvedAbs = resolveToRepoAbsPath(filePath, specifier);
          if (resolvedAbs) {
            const forbiddenByResolved = isForbiddenByResolvedPath(resolvedAbs);
            if (forbiddenByResolved) {
              violations.push({
                file: rel,
                kind: 'import',
                specifier,
                forbiddenReason: forbiddenByResolved,
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  // De-duplicate (same specifier could appear in both alias-based + resolved-based checks).
  const keyFn = (v: Violation) => `${v.file}::${v.kind}::${v.specifier}::${v.forbiddenReason}`;
  const uniq = new Map<string, Violation>();
  for (const v of violations) uniq.set(keyFn(v), v);

  return Array.from(uniq.values());
}

describe('Presentation Architecture Guard', () => {
  it('fails on forbidden dependency imports inside presentation files', () => {
    const predicate = (filePath: string) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return false;
      if (filePath.endsWith('.d.ts')) return false;
      return true;
    };

    const allFiles: string[] = [];
    for (const root of PRESENTATION_ROOTS) {
      if (!fs.existsSync(root.dir)) continue;
      allFiles.push(...collectTsFiles(root.dir, predicate));
    }

    const violations: Violation[] = [];
    for (const filePath of allFiles) {
      const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
      const root = PRESENTATION_ROOTS.find((r) =>
        rel.startsWith(path.relative(REPO_ROOT, r.dir).replaceAll(path.sep, '/')),
      );
      const isExcluded = root ? root.isExcluded(rel) : false;
      if (isExcluded) continue;

      violations.push(...collectViolationsInFile(filePath));
    }

    if (violations.length > 0) {
      const byFile = violations.reduce<Record<string, Violation[]>>((acc, v) => {
        (acc[v.file] ??= []).push(v);
        return acc;
      }, {});

      const message = Object.entries(byFile)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file, vs]) => {
          const details = vs
            .sort((x, y) => x.specifier.localeCompare(y.specifier))
            .map((v) => `- ${v.kind}: ${v.specifier} (${v.forbiddenReason})`)
            .join('\n');
          return `${file}\n${details}`;
        })
        .join('\n\n');

      expect(violations, message).toHaveLength(0);
    }

    expect(violations).toHaveLength(0);
  });
});
