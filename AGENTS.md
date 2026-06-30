<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

SharpIt / "Athlete OS" is a single Next.js 16 app (App Router, Turbopack) — training/analytics tracker. Auth = Clerk, DB = PostgreSQL via Prisma, package manager = **Yarn (classic)**. Standard scripts live in `package.json` (`dev`, `lint`, `build`, `db:push`, `db:seed`, `db:studio`). The update script already runs `yarn install` + `prisma generate` on startup.

Non-obvious things needed to actually RUN the app (the dev VM does not start these for you):

- **PostgreSQL is local + native** (not Docker; Docker isn't installed). Start it before running the app: `sudo pg_ctlcluster 16 main start`. The role/db are `sharpit` / `sharpit` / `sharpit` (password `sharpit`). `docker-compose.yml` documents the same credentials but is unused here.
- **`.env` is gitignored** and must exist with at least:
  - `DATABASE_URL` / `DIRECT_URL` = `postgresql://sharpit:sharpit@localhost:5432/sharpit?schema=public`
  - Clerk keys (see below).
  - Do NOT set a key to an empty string (e.g. `CLERK_SECRET_KEY=""`) — Prisma's dotenv expansion infinite-loops on self-referencing values, and Clerk treats an empty key as "set but missing" which breaks keyless mode. Omit the line entirely instead.
- **Clerk auth / keyless mode**: with no Clerk keys set, `@clerk/nextjs` auto-provisions an unclaimed dev instance and writes real `pk_test_`/`sk_test_` keys to `.clerk/.tmp/keyless.json`. BUT the edge middleware (`src/proxy.ts`) can't read that file, so the backend throws "Missing publishableKey". Fix: copy those two keys from `.clerk/.tmp/keyless.json` into `.env` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`, then restart `yarn dev`. (Keyless instances are temporary and may be reclaimed by Clerk; regenerate by deleting `.clerk/`, running `yarn dev` once, then copying the freshly generated keys.) `ALLOWED_EMAILS` empty = any signed-in user is allowed.
- **Yarn nuance**: the committed `yarn.lock` is in Yarn Berry (v8) format, but the VM's global `yarn` is classic 1.22 (no `packageManager`/`.yarnrc.yml` is committed). Classic `yarn install` works and produces a fully functional app, but rewrites `yarn.lock` into v1 format locally — that diff is cosmetic/expected; do not commit it. To preserve the Berry lockfile exactly, use `corepack prepare yarn@4.9.1 --activate` + `yarn config set nodeLinker node-modules` + `yarn install` instead.
- **Sync the schema** after a fresh DB: `yarn db:push` (this project uses `prisma db push`, there are no migration files). Optional demo data: `yarn db:seed`.
- **Sign-up in dev**: Clerk dev mode only accepts the bypass verification code `424242` for emails containing the `+clerk_test` subaddress (e.g. `you+clerk_test@example.com`).
- **Known app bug (not an env issue)** affecting manual testing: the "Nouvelle séance" form (`src/components/training/activity-form.tsx`) always seeds a `strengthSets` default with an empty `exercise`, which fails the zod validator for non-STRENGTH activities — so creating a RUN/BIKE/SWIM session silently does nothing (no POST). Empty number inputs (RPE) similarly block submit. To exercise the create flow via the UI, create a STRENGTH (Musculation) session and fill Exercice + both RPE fields.
