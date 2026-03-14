"""
Configuração do banco de dados.

Usa SQLAlchemy 2.0 com suporte assíncrono (asyncpg) para máxima
performance na API. As migrations são feitas com Alembic de forma síncrona.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# Motor assíncrono — usado pela API para todas as queries
engine = create_async_engine(
    settings.async_database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=settings.debug,           # Loga SQL em desenvolvimento
    pool_pre_ping=True,            # Verifica conexões antes de usar
)

# Fábrica de sessões assíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,        # Evita queries extras após commit
    autoflush=False,
)


class Base(DeclarativeBase):
    """
    Classe base para todos os modelos SQLAlchemy.
    Todos os models herdam desta classe para serem detectados
    pelo Alembic nas migrations automáticas.
    """
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection do FastAPI.

    Cria uma sessão por request e garante que ela seja fechada
    corretamente ao final, mesmo em caso de erro.

    Uso nos routers:
        db: AsyncSession = Depends(get_db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
