/**
 * What each deployed app is built from — the one list the Vercel ignore step and the deploy
 * workflow read. A change under a path deploys every app listing it; nothing else deploys.
 * Keep it in step with each app's `package.json` workspace dependencies.
 */
const ROOT_MANIFESTS = ['package.json', 'yarn.lock', 'turbo.json'];

export const DEPLOY_SCOPES = {
  web: [
    'apps/web',
    'packages/app',
    'packages/core',
    'packages/shared',
    'packages/ui',
    'packages/eslint-config',
    // The web generates the Prisma client for enum values (ADR-050).
    'packages/db/prisma',
    ...ROOT_MANIFESTS,
  ],
  api: [
    'apps/api',
    'packages/app',
    'packages/core',
    'packages/db',
    'packages/server',
    'packages/shared',
    'packages/eslint-config',
    ...ROOT_MANIFESTS,
  ],
  hub: [
    'apps/hub',
    'packages/app',
    'packages/core',
    'packages/shared',
    'packages/ui',
    'packages/eslint-config',
    ...ROOT_MANIFESTS,
  ],
};
