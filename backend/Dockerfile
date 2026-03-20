FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY . .

# Permissão de execução no entrypoint
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
