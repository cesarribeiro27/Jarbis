#!/bin/bash
set -e

# ── GeoIP Update ─────────────────────────────────────────────────────────────
# Atualiza o banco GeoLite2-City se as credenciais MaxMind estiverem configuradas.
# O arquivo .mmdb do repositório serve como fallback se o download falhar.
if [ -n "$MAXMIND_ACCOUNT_ID" ] && [ -n "$MAXMIND_LICENSE_KEY" ]; then
    echo "==> Atualizando banco GeoLite2-City..."
    mkdir -p /app/data
    cat > /tmp/GeoIP.conf <<EOF
AccountID $MAXMIND_ACCOUNT_ID
LicenseKey $MAXMIND_LICENSE_KEY
EditionIDs GeoLite2-City
DatabaseDirectory /app/data
EOF
    geoipupdate -f /tmp/GeoIP.conf && echo "==> GeoIP atualizado com sucesso." || echo "==> Aviso: falha ao atualizar GeoIP, usando banco do repositório."
else
    echo "==> GeoIP: variáveis MAXMIND_ACCOUNT_ID/MAXMIND_LICENSE_KEY não configuradas, usando banco do repositório."
fi

# ── Migrations ────────────────────────────────────────────────────────────────
echo "==> Aplicando migrations..."
SYNC_DB_URL=$(echo $DATABASE_URL | sed 's/postgresql+asyncpg/postgresql/g')
DATABASE_URL=$SYNC_DB_URL alembic upgrade head

echo "==> Iniciando API Jarbis..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
