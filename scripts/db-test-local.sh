#!/usr/bin/env bash
# Roda as migrações e os testes pgTAP num Postgres local, sem Docker.
# Uso: PGHOST=/tmp PGPORT=54329 PGUSER=postgres scripts/db-test-local.sh
set -euo pipefail
DB="${TEST_DB:-estuda_ai_test}"
cd "$(dirname "$0")/.."

dropdb --if-exists "$DB" >/dev/null
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/local-test/supabase-stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null
done
pg_prove -d "$DB" supabase/tests/*.test.sql
