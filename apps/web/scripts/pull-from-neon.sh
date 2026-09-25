#!/usr/bin/env bash
# Copie les données Neon (prod) vers Postgres local (docker compose).
# Usage : ./scripts/pull-from-neon.sh
# Prérequis : docker compose up -d, URLs Neon commentées ou exportées dans .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCAL_URL="${LOCAL_DATABASE_URL:-postgresql://sharpit:sharpit@localhost:5432/sharpit}"
LOCAL_DOCKER_URL="postgresql://sharpit:sharpit@postgres:5432/sharpit"

# DIRECT_URL Neon : variable d'env, ou ligne commentée dans .env
if [[ -z "${NEON_DIRECT_URL:-}" ]]; then
  NEON_DIRECT_URL=$(
    grep 'DIRECT_URL=' .env | grep 'neon.tech' | head -1 \
      | sed -E 's/^#?[[:space:]]*DIRECT_URL=//; s/^["'\'' ]+//; s/["'\'' ]+$//'
  )
fi

if [[ -z "$NEON_DIRECT_URL" ]]; then
  echo "Erreur : définis NEON_DIRECT_URL ou garde DIRECT_URL Neon commentée dans .env"
  exit 1
fi

PG_IMAGE="${PG_IMAGE:-postgres:18-alpine}"
DUMP="/tmp/sharpit-neon-data.sql"

echo "→ Export Neon (data-only)…"
docker run --rm "$PG_IMAGE" pg_dump "$NEON_DIRECT_URL" \
  --data-only --no-owner --no-acl --schema=public \
  -f /dev/stdout > "$DUMP"
echo "  $(wc -c < "$DUMP" | tr -d ' ') octets"

echo "→ Reset schéma local + migrations…"
docker compose exec -T postgres psql "$LOCAL_DOCKER_URL" -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
export DATABASE_URL="$LOCAL_URL"
export DIRECT_URL="$LOCAL_URL"
DATABASE_URL="$LOCAL_URL" DIRECT_URL="$LOCAL_URL" yarn prisma migrate deploy

echo "→ Import…"
grep -v 'transaction_timeout' "$DUMP" \
  | docker compose exec -T postgres psql "$LOCAL_DOCKER_URL" -v ON_ERROR_STOP=1

echo "→ Vérification"
docker compose exec -T postgres psql "$LOCAL_DOCKER_URL" -t -c 'SELECT count(*) AS activities FROM "Activity";'
docker compose exec -T postgres psql "$LOCAL_DOCKER_URL" -t -c 'SELECT count(*) AS conversations FROM "Conversation";'
docker compose exec -T postgres psql "$LOCAL_DOCKER_URL" -t -c 'SELECT count(*) AS plans FROM "TrainingPlan";'

echo ""
echo "✓ Données Neon copiées en local. Redémarre ydev."
