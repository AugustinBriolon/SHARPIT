#!/usr/bin/env node
/**
 * Prints the apps a push touches, one per line: `node scripts/ci/affected-apps.mjs <base> <head>`.
 * The deploy workflow deploys exactly those. No usable base (first push, force push) → every app.
 */
import { execFileSync } from 'node:child_process';
import { DEPLOY_SCOPES } from './deploy-scopes.mjs';
import { affectedApps } from './vercel-ignore-build.mjs';

const NO_COMMIT = /^0+$/;

function changedFiles(base, head) {
  const out = execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const [base, head = 'HEAD'] = process.argv.slice(2);
let apps;
try {
  if (!base || NO_COMMIT.test(base)) {
    throw new Error('no base commit');
  }
  apps = affectedApps(changedFiles(base, head));
} catch (error) {
  console.error(`Deploying every app (${error instanceof Error ? error.message : error})`);
  apps = Object.keys(DEPLOY_SCOPES);
}
console.log(apps.join('\n'));
