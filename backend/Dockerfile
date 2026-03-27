FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema + geoipupdate
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    && ARCH=$(dpkg --print-architecture) \
    && GEOIPUPDATE_VERSION="7.0.1" \
    && curl -fsSL "https://github.com/maxmind/geoipupdate/releases/download/v${GEOIPUPDATE_VERSION}/geoipupdate_${GEOIPUPDATE_VERSION}_linux_${ARCH}.deb" -o /tmp/geoipupdate.deb \
    && dpkg -i /tmp/geoipupdate.deb \
    && rm /tmp/geoipupdate.deb \
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
