import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * The api app owns the database (ADR-048 phase 3d): migrations, seeds and scripts run from
 * here against the schema in `packages/db`. Prisma stops reading `.env` on its own once a
 * config file exists; `dotenv/config` keeps local runs as they were (Vercel sets real env).
 */
export default defineConfig({
  schema: path.join('..', '..', 'packages', 'db', 'prisma', 'schema.prisma'),
});
