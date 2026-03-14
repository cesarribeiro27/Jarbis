#!/bin/bash
set -e

echo "==> Aplicando migrations..."
# Alembic precisa de URL síncrona (sem asyncpg)
SYNC_DB_URL=$(echo $DATABASE_URL | sed 's/postgresql+asyncpg/postgresql/g')
DATABASE_URL=$SYNC_DB_URL alembic upgrade head

echo "==> Iniciando API Jarbis..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
