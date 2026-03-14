"""
Enumerações do domínio de veículos de mídia.

Centralizar os enums garante consistência entre models, schemas e
a documentação automática do Swagger/OpenAPI.
"""

import enum


class VehicleType(str, enum.Enum):
    """Tipos de veículo de comunicação mapeados pela Lumetra."""
    TV_ABERTA = "TV_ABERTA"
    TV_PAGA = "TV_PAGA"
    RADIO = "RADIO"
    JORNAL = "JORNAL"
    REVISTA = "REVISTA"
    OOH = "OOH"                   # Out of Home: outdoor, painel, mobiliário urbano
    CINEMA = "CINEMA"
    DIGITAL = "DIGITAL"           # Publishers digitais, portais de notícia
    SOCIAL = "SOCIAL"             # Redes sociais (Facebook, Instagram, TikTok, etc.)
    STREAMING = "STREAMING"       # Plataformas de vídeo e áudio (YouTube, Spotify, etc.)
    INFLUENCER = "INFLUENCER"     # Criadores de conteúdo e influenciadores digitais


class VehicleStatus(str, enum.Enum):
    """Status operacional do veículo."""
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"
    DESCONTINUADO = "DESCONTINUADO"


class CoverageScope(str, enum.Enum):
    """Abrangência geográfica do veículo."""
    NACIONAL = "NACIONAL"
    REGIONAL = "REGIONAL"
    LOCAL = "LOCAL"
    INTERNACIONAL = "INTERNACIONAL"


class AudienceSource(str, enum.Enum):
    """Fontes de dados de audiência reconhecidas."""
    KANTAR_IBOPE = "KANTAR_IBOPE"     # Audiência TV
    COMSCORE = "COMSCORE"             # Audiência digital
    KANTAR_IBOPE_RADIO = "IBOPE_RADIO"
    IPCA = "IPCA"
    CENSIPAM = "CENSIPAM"
    SECOM = "SECOM"
    DECLARADO = "DECLARADO"           # Dado informado pelo próprio veículo
    ESTIMADO = "ESTIMADO"             # Estimativa Lumetra
    OUTRO = "OUTRO"


class AudienceMetricType(str, enum.Enum):
    """Tipos de métrica de audiência."""
    # TV e Rádio
    AUDIENCIA_MEDIA = "AUDIENCIA_MEDIA"       # % ou pontos de audiência
    SHARE = "SHARE"                            # % do total ligado
    REACH = "REACH"                            # Alcance (pessoas)
    # Digital
    UNIQUE_VISITORS = "UNIQUE_VISITORS"
    PAGE_VIEWS = "PAGE_VIEWS"
    IMPRESSOES = "IMPRESSOES"
    # OOH
    OTS = "OTS"                                # Opportunity To See
    IMPACTOS = "IMPACTOS"
    # Influenciadores
    SEGUIDORES = "SEGUIDORES"
    ENGAJAMENTO = "ENGAJAMENTO"
    # Genérico
    TIRAGEM = "TIRAGEM"                        # Jornais e revistas
    CIRCULACAO = "CIRCULACAO"


class MediaSegment(str, enum.Enum):
    """Segmentos editoriais dos veículos."""
    GENERALISTA = "GENERALISTA"
    JORNALISMO = "JORNALISMO"
    ENTRETENIMENTO = "ENTRETENIMENTO"
    ESPORTES = "ESPORTES"
    NEGOCIOS = "NEGOCIOS"
    TECNOLOGIA = "TECNOLOGIA"
    SAUDE = "SAUDE"
    EDUCACAO = "EDUCACAO"
    CULTURA = "CULTURA"
    MODA_BELEZA = "MODA_BELEZA"
    GASTRONOMIA = "GASTRONOMIA"
    INFANTIL = "INFANTIL"
    RELIGIOSO = "RELIGIOSO"
    RURAL = "RURAL"
    OUTRO = "OUTRO"
