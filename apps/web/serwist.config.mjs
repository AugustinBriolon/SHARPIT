import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { serwist } from '@serwist/next/config';

/**
 * Serwist in configurator mode — the service worker is built by `serwist build`
 * as a separate step of `yarn build`, not by a webpack plugin. The plugin form
 * (`@serwist/next`) forces `next build --webpack`, which forfeits Turbopack's
 * build disk cache (ADR: Turbopack build).
 *
 * Registration is manual (`SwRegister`), so nothing here needs to inject a
 * client entry — that is the only behaviour the plugin provided that this
 * mode does not, and the app never used it.
 */

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout.trim() || randomUUID();

export default await serwist({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // Every route is server-rendered on demand; there is no prerendered HTML
  // worth precaching, and `/~offline` is precached explicitly below.
  precachePrerendered: false,
  globPatterns: [
    '.next/static/**/*.{js,css,woff,woff2}',
    'public/icons/*.{png,svg}',
    'public/favicon.svg',
    'public/favicon-dark.svg',
    'public/favicon.ico',
  ],
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
});
