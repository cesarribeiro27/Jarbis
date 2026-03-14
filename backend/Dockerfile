FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instala uv (gerenciador de pacotes Python moderno e rápido)
RUN pip install uv

# Copia arquivos de dependências
COPY requirements.txt pyproject.toml ./

# Instala dependências do projeto
RUN uv pip install --system -r requirements.txt

# Copia o código
COPY . .

# Permissão de execução no entrypoint
RUN chmod +x /app/entrypoint.sh

# Expõe a porta da API
EXPOSE 8000

# Entrypoint: roda migrations e inicia o servidor
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
