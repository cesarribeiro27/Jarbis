"""
Cliente ClickHouse — singleton para o banco de eventos de links.

Usado exclusivamente pelo módulo links para registrar e consultar
eventos de clique com alta performance.
"""

import logging
import clickhouse_connect
from app.config import settings

logger = logging.getLogger(__name__)

_client = None


def get_clickhouse():
    """Retorna cliente ClickHouse singleton (conexão HTTPS). Reseta em caso de falha."""
    global _client
    if _client is None:
        _client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            user=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database=settings.clickhouse_database,
            secure=True,
        )
    return _client


def reset_clickhouse():
    """Força reconexão na próxima chamada a get_clickhouse()."""
    global _client
    _client = None


def ensure_tables():
    """
    Cria as tabelas no ClickHouse se não existirem.
    Chamado no startup da aplicação.
    """
    if not settings.clickhouse_host:
        return

    client = get_clickhouse()

    client.command("""
        CREATE TABLE IF NOT EXISTS link_events (
            event_id     UUID         DEFAULT generateUUIDv4(),
            tenant_id    String,
            link_id      String,
            slug         String,
            clicked_at   DateTime64(3, 'UTC') DEFAULT now64(),
            ip_address   String,
            country      String,
            city         String,
            device_type  String,
            browser      String,
            os           String,
            referrer     String,
            user_agent   String
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(clicked_at)
        ORDER BY (tenant_id, link_id, clicked_at)
        TTL clicked_at + INTERVAL 5 YEAR
        SETTINGS index_granularity = 8192
    """)
