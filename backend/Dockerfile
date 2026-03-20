FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala uv
RUN pip install uv --quiet

# Copia pyproject.toml e extrai dependências para requirements.txt via tomllib (built-in Python 3.11+)
COPY pyproject.toml ./
RUN python3 -c "
import tomllib, sys
with open('pyproject.toml', 'rb') as f:
    d = tomllib.load(f)
deps = d['project']['dependencies']
# Remove comentários inline e escreve um dep por linha
clean = [dep.strip() for dep in deps if dep.strip() and not dep.strip().startswith('#')]
sys.stdout.write('\n'.join(clean) + '\n')
" > /tmp/requirements_resolved.txt \
  && cat /tmp/requirements_resolved.txt \
  && uv pip install --system -r /tmp/requirements_resolved.txt

# Copia o código
COPY . .

# Permissão de execução no entrypoint
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
