#!/bin/sh
set -e

# ============================================================================
# taugether container entrypoint.
#
# 1. Initializes the database schema on first boot (the app has no migrations).
# 2. Renders nginx config with the correct ports.
# 3. Starts nginx + the Go API under supervisord.
# ============================================================================

export PORT="${PORT:-8080}"
export BACKEND_PORT="${BACKEND_PORT:-9000}"

echo "==> taugether entrypoint"
echo "    external port (nginx): ${PORT}"
echo "    internal port (api):   ${BACKEND_PORT}"

# ----------------------------------------------------------------------------
# 1. Database schema bootstrap (idempotent).
#    Runs schema.sql only when the 'users' table does not exist yet.
#    Set SCHEMA_DATABASE_URL to use a different connection for this step
#    (e.g. Neon's direct, non-pooled URL) than the app's DATABASE_URL.
# ----------------------------------------------------------------------------
SCHEMA_URL="${SCHEMA_DATABASE_URL:-$DATABASE_URL}"
if [ -n "$SCHEMA_URL" ] && command -v psql >/dev/null 2>&1; then
    SCHEMA_STATUS=$(psql "$SCHEMA_URL" -tAc \
        "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users'" 2>/dev/null || true)
    if [ "$SCHEMA_STATUS" = "1" ]; then
        echo "==> database schema already present, skipping init"
    else
        echo "==> applying schema.sql to initialize the database"
        psql "$SCHEMA_URL" -v ON_ERROR_STOP=1 -q -f /app/schema.sql
        echo "==> database initialized"
    fi
else
    echo "==> skipping database init (DATABASE_URL not set or psql unavailable)"
fi

# ----------------------------------------------------------------------------
# 2. Render nginx config (only the two port placeholders are substituted,
#    nginx variables like $host are left untouched).
# ----------------------------------------------------------------------------
envsubst '${PORT} ${BACKEND_PORT}' \
    < /etc/nginx/conf.d/app.conf.template \
    > /etc/nginx/conf.d/default.conf

# ----------------------------------------------------------------------------
# 3. Run nginx + API under supervisord (foreground, PID 1).
# ----------------------------------------------------------------------------
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
