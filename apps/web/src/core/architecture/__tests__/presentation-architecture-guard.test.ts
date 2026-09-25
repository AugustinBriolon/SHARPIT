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

type ForbiddenSpecifierRule = {
  prefix: string;
  reason: string;
  allowedSpecifier?: string;
};

const FORBIDDEN_SPECIFIER_RULES: ForbiddenSpecifierRule[] = [
  { prefix: FORBIDDEN_ALIASES.inference, reason: 'inference' },
  { prefix: FORBIDDEN_ALIASES.digitalTwin, reason: 'digital-twin' },
  { prefix: FORBIDDEN_ALIASES.featureEngine, reason: 'feature-engine' },
  { prefix: FORBIDDEN_ALIASES.observationEngine, reason: 'observation-engine' },
  { prefix: FORBIDDEN_ALIASES.featureOrInferenceEnginesSingletons, reason: 'engines' },
  { prefix: FORBIDDEN_ALIASES.productInsightProjections, reason: 'product-insight-projections' },
  {
    prefix: FORBIDDEN_ALIASES.productInsightBuilders,
    reason: 'product-insight-builders',
    allowedSpecifier: ALLOWED_PRODUCT_INSIGHT_TYPES,
  },
];

function isForbiddenBySpecifier(specifier: string): string | null {
  for (const rule of FORBIDDEN_SPECIFIER_RULES) {
    if (!matchesPrefix(specifier, rule.prefix)) {
      continue;
    }
    if (rule.allowedSpecifier && specifier === rule.allowedSpecifier) {
      return null;
    }
    return rule.reason;
  }
  return null;
}

function isImportDeclarationTypeOnly(node: Ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  // Side-effect import: `import 'x'`.
  if (!clause) {
    return false;
  }
  if (clause.isTypeOnly) {
    return true;
  }

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
      if (entry.name === 'node_modules' || entry.name.startsWith('.next')) {
        continue;
      }
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
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

const FORBIDDEN_RESOLVED_PREFIXES: Array<{ prefix: string; reason: string }> = [
  { prefix: path.join(REPO_ROOT, 'src', 'core', 'inference'), reason: 'inference' },
  { prefix: path.join(REPO_ROOT, 'src', 'core', 'digital-twin'), reason: 'digital-twin' },
  { prefix: path.join(REPO_ROOT, 'src', 'core', 'features'), reason: 'feature-engine' },
  { prefix: path.join(REPO_ROOT, 'src', 'core', 'observation'), reason: 'observation-engine' },
  { prefix: path.join(REPO_ROOT, 'src', 'lib', 'engines'), reason: 'engines' },
  {
    prefix: path.join(REPO_ROOT, 'src', 'core', 'product-insight'),
    reason: 'product-insight-builders',
  },
  {
    prefix: path.join(REPO_ROOT, 'src', 'lib', 'product-insight'),
    reason: 'product-insight-projections',
  },
];

function isForbiddenByResolvedPath(resolvedAbsPath: string): string | null {
  const allowedProductInsightTypesResolved = path.join(
    REPO_ROOT,
    'src',
    'core',
    'product-insight',
    'types.ts',
  );
  if (resolvedAbsPath === allowedProductInsightTypesResolved) {
    return null;
  }

  for (const rule of FORBIDDEN_RESOLVED_PREFIXES) {
    if (
      resolvedAbsPath === rule.prefix ||
      resolvedAbsPath.startsWith(`${rule.prefix}${path.sep}`)
    ) {
      return rule.reason;
    }
  }

  return null;
}

type SpecifierViolationContext = {
  violations: Violation[];
  rel: string;
  filePath: string;
};

function pushResolvedSpecifierViolation(
  context: SpecifierViolationContext,
  kind: Violation['kind'],
  specifier: string,
): void {
  const resolvedAbs = resolveToRepoAbsPath(context.filePath, specifier);
  if (!resolvedAbs) {
    return;
  }

  const forbiddenByResolved = isForbiddenByResolvedPath(resolvedAbs);
  if (!forbiddenByResolved) {
    return;
  }

  context.violations.push({
    file: context.rel,
    kind,
    specifier,
    forbiddenReason: forbiddenByResolved,
  });
}

function recordSpecifierViolation(
  context: SpecifierViolationContext,
  kind: Violation['kind'],
  specifier: string,
): void {
  const forbiddenReason = isForbiddenBySpecifier(specifier);
  if (forbiddenReason) {
    context.violations.push({
      file: context.rel,
      kind,
      specifier,
      forbiddenReason,
    });
    return;
  }

  pushResolvedSpecifierViolation(context, kind, specifier);
}

function visitImportDeclaration(node: Ts.ImportDeclaration, context: SpecifierViolationContext) {
  const specifierNode = node.moduleSpecifier;
  if (!specifierNode || !ts.isStringLiteral(specifierNode)) {
    return;
  }

  const isValueImport = !isImportDeclarationTypeOnly(node);
  if (!isValueImport) {
    return;
  }

  const kind: Violation['kind'] = node.importClause === null ? 'side-effect-import' : 'import';
  recordSpecifierViolation(context, kind, specifierNode.text);
}

function visitExportDeclaration(node: Ts.ExportDeclaration, context: SpecifierViolationContext) {
  const { moduleSpecifier } = node;
  if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
    return;
  }

  const isTypeOnly = (node as Ts.ExportDeclaration & { isTypeOnly?: boolean }).isTypeOnly === true;
  if (isTypeOnly) {
    return;
  }

  recordSpecifierViolation(context, 'export', moduleSpecifier.text);
}

function visitDynamicImport(node: Ts.CallExpression, context: SpecifierViolationContext) {
  const [arg0] = node.arguments;
  if (!arg0 || !ts.isStringLiteral(arg0)) {
    return;
  }

  recordSpecifierViolation(context, 'dynamic-import', arg0.text);
}

function visitRequireCall(node: Ts.CallExpression, context: SpecifierViolationContext) {
  const [arg0] = node.arguments;
  if (!arg0 || !ts.isStringLiteral(arg0)) {
    return;
  }

  recordSpecifierViolation(context, 'require', arg0.text);
}

function visitImportEquals(node: Ts.ImportEqualsDeclaration, context: SpecifierViolationContext) {
  const moduleRef = node.moduleReference;
  if (
    !moduleRef ||
    !ts.isExternalModuleReference(moduleRef) ||
    !moduleRef.expression ||
    !ts.isStringLiteral(moduleRef.expression)
  ) {
    return;
  }

  recordSpecifierViolation(context, 'import', moduleRef.expression.text);
}

function isDynamicImportCall(node: Ts.CallExpression): boolean {
  return node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function isRequireCall(node: Ts.CallExpression): boolean {
  return ts.isIdentifier(node.expression) && node.expression.text === 'require';
}

function visitSourceNode(node: Ts.Node, context: SpecifierViolationContext): void {
  if (ts.isImportDeclaration(node)) {
    visitImportDeclaration(node, context);
    return;
  }
  if (ts.isExportDeclaration(node)) {
    visitExportDeclaration(node, context);
    return;
  }
  if (ts.isCallExpression(node) && isDynamicImportCall(node)) {
    visitDynamicImport(node, context);
    return;
  }
  if (ts.isCallExpression(node) && isRequireCall(node)) {
    visitRequireCall(node, context);
    return;
  }
  if (ts.isImportEqualsDeclaration(node)) {
    visitImportEquals(node, context);
  }
}

function collectViolationsInFile(filePath: string): Violation[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);

  const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
  const context: SpecifierViolationContext = { violations: [], rel, filePath };

  const visit = (node: Ts.Node) => {
    visitSourceNode(node, context);
    ts.forEachChild(node, visit);
  };

  visit(source);

  // De-duplicate (same specifier could appear in both alias-based + resolved-based checks).
  const keyFn = (v: Violation) => `${v.file}::${v.kind}::${v.specifier}::${v.forbiddenReason}`;
  const uniq = new Map<string, Violation>();
  for (const v of context.violations) {
    uniq.set(keyFn(v), v);
  }

  return Array.from(uniq.values());
}

describe('Presentation Architecture Guard', () => {
  it('fails on forbidden dependency imports inside presentation files', () => {
    const predicate = (filePath: string) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return false;
      }
      if (filePath.endsWith('.d.ts')) {
        return false;
      }
      return true;
    };

    const allFiles: string[] = [];
    for (const root of PRESENTATION_ROOTS) {
      if (!fs.existsSync(root.dir)) {
        continue;
      }
      allFiles.push(...collectTsFiles(root.dir, predicate));
    }

    const violations: Violation[] = [];
    for (const filePath of allFiles) {
      const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
      const root = PRESENTATION_ROOTS.find((r) =>
        rel.startsWith(path.relative(REPO_ROOT, r.dir).replaceAll(path.sep, '/')),
      );
      const isExcluded = root ? root.isExcluded(rel) : false;
      if (isExcluded) {
        continue;
      }

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

const LEGACY_PATTERN_ROOTS = [
  path.join(REPO_ROOT, 'src', 'components'),
  path.join(REPO_ROOT, 'src', 'hooks'),
  path.join(REPO_ROOT, 'src', 'lib', 'presentation'),
];

const LEGACY_FORBIDDEN_PATTERNS: Array<{ id: string; regex: RegExp; hint: string }> = [
  {
    id: 'pickRecommendation',
    regex: /\bpickRecommendation\b/,
    hint: 'Use DecisionState routing via snapshot.decision / projection helpers',
  },
  {
    id: 'buildWhyEvidence-legacy',
    regex: /\bbuildWhyEvidence\b(?!FromDecision)/,
    hint: 'Use buildWhyEvidenceFromDecision(decision, ...)',
  },
  {
    id: 'resolveConfidenceHref-legacy',
    regex: /\bresolveConfidenceHref\b(?!FromDecision)/,
    hint: 'Use resolveConfidenceHrefFromDecision(decision)',
  },
  {
    id: 'resolveLimitingFactorHref-legacy',
    regex: /\bresolveLimitingFactorHref\b(?!FromDecision)/,
    hint: 'Use resolveLimitingFactorHrefFromDecision(decision)',
  },
  {
    id: 'reasoning-overallVerdict',
    regex: /reasoning\.(?:overallVerdict|topAction|keyFindings)/,
    hint: 'ReasoningState is narrative-only — read snapshot.decision instead',
  },
  {
    id: 'isAdviceActionable-reasoning',
    regex: /\bisAdviceActionable\s*\(\s*[^)]*reasoning/,
    hint: 'Use isAdviceActionableFromDecision(decision)',
  },
];

type LegacyPatternHit = {
  file: string;
  pattern: string;
  hint: string;
  line: number;
  excerpt: string;
};

function collectLegacyPatternHits(filePath: string): LegacyPatternHit[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
  const lines = text.split('\n');
  const hits: LegacyPatternHit[] = [];

  for (const { id, regex, hint } of LEGACY_FORBIDDEN_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) {
        continue;
      }
      if (regex.test(line)) {
        hits.push({
          file: rel,
          pattern: id,
          hint,
          line: i + 1,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  }

  return hits;
}

describe('Presentation Legacy Pattern Guard (P2)', () => {
  it('fails when presentation layers reintroduce deprecated decision paths', () => {
    const predicate = (filePath: string) =>
      (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) && !filePath.endsWith('.d.ts');

    const allFiles: string[] = [];
    for (const root of LEGACY_PATTERN_ROOTS) {
      if (!fs.existsSync(root)) {
        continue;
      }
      allFiles.push(...collectTsFiles(root, predicate));
    }

    const hits: LegacyPatternHit[] = [];
    for (const filePath of allFiles) {
      hits.push(...collectLegacyPatternHits(filePath));
    }

    if (hits.length > 0) {
      const message = hits
        .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
        .map((h) => `${h.file}:${h.line} [${h.pattern}] ${h.excerpt}\n  → ${h.hint}`)
        .join('\n\n');
      expect(hits, message).toHaveLength(0);
    }

    expect(hits).toHaveLength(0);
  });
});
