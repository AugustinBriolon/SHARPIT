#!/usr/bin/env node
/**
 * Restore nullish semantics after eqeqeq mass-replace:
 * `!= null` -> `!== null` broke undefined narrowing.
 * Fixes `!== null` / `=== null` with explicit undefined checks.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/lib', 'src/core', 'src/hooks', 'src/infrastructure'];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

/** Match a JS expression left of === / !== (conservative). */
const EXPR =
  '(?:\\([^()]*(?:\\([^()]*\\)[^()]*)*\\)|' +
  '[a-zA-Z_$][\\w$]*(?:\\?\\.[a-zA-Z_$][\\w$]*|\\.[a-zA-Z_$][\\w$]*|\\[[^\\]]+\\])*)';

const NOT_NULL_RE = new RegExp(`(${EXPR})\\s*!==\\s*null\\b`, 'g');
const EQ_NULL_RE = new RegExp(`(${EXPR})\\s*===\\s*null\\b`, 'g');

function alreadyNullishGuarded(source, expr, index) {
  const before = source.slice(Math.max(0, index - expr.length - 40), index);
  return (
    before.endsWith(`${expr} !== undefined && `) ||
    before.endsWith(`${expr} === undefined || `) ||
    before.includes(`${expr} !== undefined && ${expr}`)
  );
}

function fixNotNullChecks(source) {
  return source.replace(NOT_NULL_RE, (match, expr, offset) => {
    if (alreadyNullishGuarded(source, expr, offset)) return match;
    if (match.includes('!== undefined &&')) return match;
    return `(${expr} !== undefined && ${expr} !== null)`;
  });
}

function fixEqNullChecks(source) {
  return source.replace(EQ_NULL_RE, (match, expr, offset) => {
    if (alreadyNullishGuarded(source, expr, offset)) return match;
    // Only rewrite === null when used as nullish sentinel (guards / ternaries / filters)
    const after = source.slice(offset + match.length, offset + match.length + 30);
    const before = source.slice(Math.max(0, offset - 20), offset);
    const isGuard =
      /^\s*(\?|\)|,|&&|\|\||;|\]|$)/.test(after) ||
      /(if|while|return|filter|\.filter)\s*\(?\s*$/.test(before) ||
      /\?\s*$/.test(before);
    if (!isGuard) return match;
    return `(${expr} === undefined || ${expr} === null)`;
  });
}

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let next = fixNotNullChecks(original);
  next = fixEqNullChecks(next);
  if (next !== original) {
    fs.writeFileSync(filePath, next);
    return true;
  }
  return false;
}

const files = ROOTS.flatMap((root) => walk(path.join(process.cwd(), root)));
let changed = 0;
for (const file of files) {
  if (fixFile(file)) changed += 1;
}
console.log(`Updated ${changed} files`);
