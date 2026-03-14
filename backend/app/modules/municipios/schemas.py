import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class MunicipioResponse(BaseModel):
    id: uuid.UUID
    codigo_ibge: str
    nome: str
    uf: str
    nome_uf: str
    regiao: str
    populacao_2022: int | None

    model_config = {"from_attributes": True}


class MunicipioFilterParams(BaseModel):
    q: str | None = Field(default=None, description="Busca por nome do município")
    uf: str | None = Field(default=None, description="Filtrar por UF (SP, RJ...)")
    regiao: str | None = Field(default=None, description="Filtrar por região")
