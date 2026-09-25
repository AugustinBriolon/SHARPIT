/**
 * Remplace == / != par === / !== dans les fichiers TS/TSX (hors chaînes et commentaires).
 * Usage: node scripts/fix-eqeqeq.mjs
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GLOBS = ['src/**/*.ts', 'src/**/*.tsx', 'e2e/**/*.ts', 'prisma/**/*.ts'];

function collectFiles() {
  const files = new Set();
  for (const pattern of GLOBS) {
    for (const file of globSync(pattern, { cwd: ROOT, absolute: true })) {
      files.add(file);
    }
  }
  return [...files];
}

function fixFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const replacements = [];

  function visit(node) {
    if (ts.isBinaryExpression(node)) {
      const { operatorToken } = node;
      if (operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) {
        replacements.push({
          start: operatorToken.getStart(sourceFile),
          end: operatorToken.getEnd(),
          text: '===',
        });
      } else if (operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) {
        replacements.push({
          start: operatorToken.getStart(sourceFile),
          end: operatorToken.getEnd(),
          text: '!==',
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (replacements.length === 0) {
    return 0;
  }

  replacements.sort((a, b) => b.start - a.start);
  let updated = source;
  for (const { start, end, text } of replacements) {
    updated = updated.slice(0, start) + text + updated.slice(end);
  }
  writeFileSync(filePath, updated);
  return replacements.length;
}

let total = 0;
let fileCount = 0;
for (const file of collectFiles()) {
  const count = fixFile(file);
  if (count > 0) {
    total += count;
    fileCount += 1;
  }
}

console.log(`Fixed ${total} comparisons in ${fileCount} files`);
