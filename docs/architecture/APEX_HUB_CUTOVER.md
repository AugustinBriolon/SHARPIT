# Apex hub cutover (ADR-051)

The apex contract (AASA, `/connect/garmin/*`, `/privacy`, `/terms`) must answer at every step.

## 1. Before (owner)

The hub needs the Clerk secret of the production instance (the value `sharpit-webapp` holds):

```bash
cd /Users/H6245/Documents/DEV/PERSO/SHARPIT/SHARPIT-WEBAPP/apps/hub && vercel link --yes --project sharpit-hub && vercel env add CLERK_SECRET_KEY production
```

## 2. Deploy the hub (no domain yet)

`vercel deploy --prod` from the repository root with the hub project (`VERCEL_PROJECT_ID`), then check it with
`vercel curl` on its deployment URL: AASA 200 JSON with the team id, `/connect/garmin` → `/sign-in` with
`redirect_url`, `/connect/garmin/callback` 200 HTML, `/privacy` 200, `/` → `https://web.sharpit.app/`.

## 3. Move the domains (quiet hour)

Same moves as `api.sharpit.app` in phase 2 (Vercel API; or the dashboard, project → Domains):

```bash
T=team_jMIBl43rBL63n8TtKtvEE1NO
vercel api "/v9/projects/sharpit-webapp/domains/www.sharpit.app?teamId=$T" -X DELETE
vercel api "/v9/projects/sharpit-webapp/domains/sharpit.app?teamId=$T" -X DELETE
vercel api "/v10/projects/sharpit-hub/domains?teamId=$T" -X POST -f name=sharpit.app
# www stays a redirect to the apex, as it is on sharpit-webapp today
vercel api "/v10/projects/sharpit-hub/domains?teamId=$T" -X POST -f name=www.sharpit.app -f redirect=sharpit.app
```

Removing a domain from one project before adding it to the other leaves up to a minute without the apex.
Immediately after: `yarn api smoke:must-private https://sharpit.app` must be green.

**Rollback:** give `sharpit.app` and `www.sharpit.app` back to `sharpit-webapp` (it still serves every apex path
until step 4).

## 4. Merge the web change

Only now merge the branch that drops the apex pages from the web (`phase-4/hub`): the web then redirects
`/privacy`, `/terms`, `/connect/*`, `/.well-known/*` on `web.sharpit.app` to the apex.
