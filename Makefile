# =============================================================================
# Jarbis — Comandos de Desenvolvimento
# =============================================================================

.PHONY: help up down build logs shell-backend shell-db migrate seed test lint

# Exibe todos os comandos disponíveis
help:
	@echo ""
	@echo "  Jarbis — Comandos disponíveis:"
	@echo ""
	@echo "  make up           Sobe todos os serviços"
	@echo "  make down         Derruba todos os serviços"
	@echo "  make build        Reconstrói as imagens Docker"
	@echo "  make logs         Exibe logs em tempo real"
	@echo "  make migrate      Roda as migrations do banco"
	@echo "  make seed         Popula o banco com dados iniciais"
	@echo "  make shell-backend  Abre shell no container do backend"
	@echo "  make shell-db       Abre psql no banco de dados"
	@echo "  make test         Roda os testes do backend"
	@echo "  make lint         Roda o linter (ruff)"
	@echo ""

# Sobe o ambiente completo
up:
	@cp -n .env.example .env 2>/dev/null || true
	docker compose up -d
	@echo ""
	@echo "  Jarbis rodando em:"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:8000"
	@echo "  API Docs:  http://localhost:8000/docs"
	@echo "  RabbitMQ:  http://localhost:15672"
	@echo ""

# Derruba o ambiente
down:
	docker compose down

# Reconstrói as imagens
build:
	docker compose build --no-cache

# Logs em tempo real
logs:
	docker compose logs -f

# Logs de um serviço específico: make logs-backend
logs-%:
	docker compose logs -f $*

# Shell no backend
shell-backend:
	docker compose exec backend bash

# Shell no PostgreSQL
shell-db:
	docker compose exec postgres psql -U jarbis -d jarbis_db

# Roda as migrations
migrate:
	docker compose exec backend alembic upgrade head

# Reverte a última migration
migrate-down:
	docker compose exec backend alembic downgrade -1

# Cria uma nova migration
migrate-create:
	docker compose exec backend alembic revision --autogenerate -m "$(name)"

# Popula o banco com dados iniciais
seed:
	docker compose exec backend python -m app.seeds.run

# Roda os testes
test:
	docker compose exec backend pytest tests/ -v

# Linter e formatação
lint:
	docker compose exec backend ruff check app/
	docker compose exec backend ruff format app/

# Reset completo (apaga volumes)
reset:
	docker compose down -v
	@echo "Volumes apagados. Rode 'make up' para reiniciar do zero."
