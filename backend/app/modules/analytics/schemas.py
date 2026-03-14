from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_veiculos: int
    total_campanhas_ooh: int
    total_paineis_ooh: int
    total_relatorios: int
    total_usuarios: int
    paineis_geocodificados: int
    alcance_total_estimado: int
