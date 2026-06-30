# Athlete OS

Operating System de performance — entraînement, analytics, récupération.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- TanStack Query, React Hook Form, Zod

## Démarrage

### PostgreSQL

```bash
# Option A — Docker
npm run db:up

# Option B — Postgres natif (macOS / Homebrew)
brew install postgresql@16
brew services start postgresql@16
createuser sharpit --createdb 2>/dev/null; \
  psql postgres -c "ALTER ROLE sharpit WITH LOGIN PASSWORD 'sharpit';" && \
  createdb sharpit -O sharpit
```

### App

```bash
cp .env.example .env   # puis renseigne les variables
npm run db:push        # synchronise le schéma
npm run db:seed        # données de démo (optionnel)
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Intégration Strava

1. Crée une application sur [strava.com/settings/api](https://www.strava.com/settings/api)
   (Authorization Callback Domain : `localhost`).
2. Renseigne dans `.env` :
   ```
   STRAVA_CLIENT_ID="..."
   STRAVA_CLIENT_SECRET="..."
   STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"
   ```
3. Redémarre le serveur, va dans **Settings → Strava → Connecter**, puis
   **Synchroniser**. Les activités sont importées et dédupliquées par `stravaId`.

> Après toute modification du schéma Prisma, relance `npm run dev` pour que le
> serveur recharge le client généré.

## Modules

- **Dashboard** — séance du jour, recovery, charge d'entraînement (ACWR)
- **Training** — CRUD Run / Bike / Swim / Strength
- **Settings** — connexion & synchronisation Strava

Les autres modules (Analytics, Recovery, Goals…) sont prévus dans la navigation.

# SHARPIT
