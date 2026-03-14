"""
Configurações centrais da aplicação.

Usa pydantic-settings para carregar variáveis de ambiente com
validação de tipos automática. Garante que a aplicação falhe
imediatamente se uma variável obrigatória estiver ausente.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Aplicação ---
    app_name: str = "Lumetra"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    # --- Banco de dados ---
    database_url: str
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # --- Redis ---
    redis_url: str = "redis://redis:6379/0"

    # --- Autenticação JWT ---
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # --- CORS ---
    backend_cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def async_database_url(self) -> str:
        """Converte a URL do banco para usar driver assíncrono (asyncpg). Suporta postgres:// e postgresql://."""
        url = self.database_url
        if "+asyncpg" in url:
            return url
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
        url = url.replace("postgresql://", "postgresql+asyncpg://")
        url = url.replace("postgres://", "postgresql+asyncpg://")
        return url

    @property
    def sync_database_url(self) -> str:
        """URL síncrona para o Alembic (migrations). Suporta postgres://, postgresql://, postgresql+asyncpg://."""
        url = self.database_url
        url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        url = url.replace("postgresql://", "postgresql+psycopg2://")
        url = url.replace("postgres://", "postgresql+psycopg2://")
        return url


@lru_cache
def get_settings() -> Settings:
    """
    Retorna as configurações em singleton.
    lru_cache garante que o arquivo .env é lido apenas uma vez.
    """
    return Settings()


settings = get_settings()
