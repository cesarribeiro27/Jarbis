"""
Configuração do Alembic para migrations automáticas.

Detecta automaticamente todos os models ao importar Base,
desde que os models estejam importados antes de rodar o Alembic.
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Importa as configurações da aplicação
from app.config import settings
from app.database import Base

# Importa todos os models para o Alembic detectá-los
# IMPORTANTE: cada novo model deve ser importado aqui
from app.modules.reports.models import Report  # noqa: F401
from app.modules.reports.ai_usage_models import AIUsageLog  # noqa: F401
from app.modules.admin.models import UserSession  # noqa: F401
from app.modules.tenants.models import Tenant, User  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata com todos os models registrados
target_metadata = Base.metadata

# Usa a URL síncrona do banco (psycopg2) para as migrations
config.set_main_option("sqlalchemy.url", settings.sync_database_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
