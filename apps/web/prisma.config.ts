import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * The web never connects to the database (ADR-048 phase 3f); it only generates the client for
 * the enum values its shared modules use.
 */
export default defineConfig({
  schema: path.join('..', '..', 'packages', 'db', 'prisma', 'schema.prisma'),
});
