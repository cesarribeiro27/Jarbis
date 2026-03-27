FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema + geoipupdate
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    && curl -fsSL https://repos.maxmind.com/apt/setup.sh | bash \
    && apt-get install -y geoipupdate \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python a partir do pyproject.toml
COPY pyproject.toml ./
RUN python3 -c "import tomllib; deps=tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']; print('\n'.join(deps))" > /tmp/req.txt \
    && pip install --no-cache-dir -r /tmp/req.txt

# Copia o código
COPY . .

# Permissão de execução no entrypoint
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
