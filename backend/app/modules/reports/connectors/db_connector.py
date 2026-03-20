"""Conector de banco de dados externo — PostgreSQL e MySQL."""

from __future__ import annotations

import base64
import os
from typing import Any

from fastapi import HTTPException


def _get_fernet():
    from cryptography.fernet import Fernet
    key = os.environ.get("DB_ENCRYPTION_KEY", "")
    if not key:
        # Generate a stable key from SECRET_KEY
        import hashlib
        secret = os.environ.get("SECRET_KEY", "jarbis-secret-key-default")
        raw = hashlib.sha256(secret.encode()).digest()
        key = base64.urlsafe_b64encode(raw).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_password(password: str) -> str:
    f = _get_fernet()
    return f.encrypt(password.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    f = _get_fernet()
    return f.decrypt(encrypted.encode()).decode()


async def test_connection(
    db_type: str, host: str, port: int, database: str, username: str, password: str
) -> dict:
    """Testa a conexão com o banco externo. Retorna {ok, error}."""
    try:
        if db_type == "postgresql":
            import asyncpg
            conn = await asyncpg.connect(
                host=host, port=port, database=database,
                user=username, password=password, timeout=10
            )
            await conn.close()
        elif db_type == "mysql":
            import aiomysql
            conn = await aiomysql.connect(
                host=host, port=port, db=database,
                user=username, password=password, connect_timeout=10
            )
            conn.close()
        else:
            return {"ok": False, "error": f"Tipo não suportado: {db_type}"}
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}


async def run_query(
    db_type: str, host: str, port: int, database: str,
    username: str, password: str, query: str, limit: int = 5000
) -> list[dict]:
    """Executa query SQL e retorna list[dict]."""
    # Safety: only SELECT queries
    q = query.strip()
    if not q.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Apenas queries SELECT são permitidas.")

    # Inject LIMIT if not present
    if "LIMIT" not in q.upper():
        q = f"{q} LIMIT {limit}"

    try:
        if db_type == "postgresql":
            import asyncpg
            conn = await asyncpg.connect(
                host=host, port=port, database=database,
                user=username, password=password, timeout=30
            )
            try:
                rows = await conn.fetch(q)
                return [dict(r) for r in rows]
            finally:
                await conn.close()
        elif db_type == "mysql":
            import aiomysql
            conn = await aiomysql.connect(
                host=host, port=port, db=database,
                user=username, password=password, connect_timeout=30
            )
            try:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(q)
                    return list(await cur.fetchall())
            finally:
                conn.close()
        else:
            raise HTTPException(status_code=400, detail=f"Tipo não suportado: {db_type}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro na query: {str(e)[:300]}")
