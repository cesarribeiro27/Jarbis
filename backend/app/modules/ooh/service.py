"""
Serviço OOH — lógica de negócio para campanhas e painéis.

Fluxo principal:
  1. Upload CSV → parse → cria OohCampaign + OohPanels (geocode_status=PENDENTE)
  2. Background task → geocodifica via Nominatim (OSM) — 1 req/s
  3. Enriquece com população IBGE do município
  4. Calcula alcance estimado por painel

Geocodificação:
  - Usa Nominatim (OpenStreetMap) — gratuito, sem API key
  - Rate limit: máx 1 req/s (conforme política do Nominatim)
  - Fallback: marca como FALHOU para revisão manual
"""

import asyncio
import csv
import io
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.municipios.models import Municipio
from app.modules.ooh.models import OohCampaign, OohCampaignShare, OohPanel
from app.modules.ooh.schemas import CsvUploadResult, OohCampaignResponse

# Raio de visibilidade padrão por formato (metros)
RAIO_POR_FORMATO = {
    "OUTDOOR":    300,
    "BACKLIGHT":  250,
    "FRONTLIGHT": 250,
    "DIGITAL":    150,
    "MOBILIARIO": 100,
    "BUSDOOR":     50,
    "METRO":      200,
    "AEROPORTO":  300,
    "OUTRO":      200,
}

# Colunas obrigatórias no CSV
CSV_REQUIRED = {"endereco"}

# Mapeamento flexível de cabeçalhos (lowercase → campo interno)
HEADER_MAP = {
    "endereco": "endereco", "endereço": "endereco", "address": "endereco",
    "nome": "nome", "name": "nome", "painel": "nome",
    "cidade": "cidade", "city": "cidade", "municipio": "cidade", "município": "cidade",
    "uf": "uf", "estado": "uf", "state": "uf",
    "cep": "cep",
    "formato": "formato", "format": "formato", "tipo": "formato", "type": "formato",
    "largura_m": "largura_m", "largura": "largura_m", "width_m": "largura_m",
    "altura_m": "altura_m", "altura": "altura_m", "height_m": "altura_m",
    "faces": "faces",
    "digital": "digital",
    "iluminado": "iluminado", "iluminação": "iluminado", "luz": "iluminado",
    "operadora": "operadora", "operator": "operadora", "empresa": "operadora",
    "codigo_operadora": "codigo_operadora", "codigo": "codigo_operadora",
    "fluxo_diario": "fluxo_diario", "fluxo": "fluxo_diario", "pessoas_dia": "fluxo_diario",
    "ots_mensal": "ots_mensal", "ots": "ots_mensal",
    "valor_periodo": "valor_periodo", "valor": "valor_periodo", "preco": "valor_periodo",
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Lumetra/1.0 (contato@lumetra.com.br)"


def _parse_bool(value: str) -> bool:
    return str(value).strip().lower() in ("sim", "yes", "1", "true", "s", "y")


def _parse_float(value: str) -> float | None:
    try:
        return float(str(value).strip().replace(",", "."))
    except (ValueError, TypeError):
        return None


def _parse_int(value: str) -> int | None:
    try:
        return int(float(str(value).strip().replace(",", ".")))
    except (ValueError, TypeError):
        return None


def _normalize_formato(value: str) -> str:
    v = str(value).strip().upper()
    valid = set(RAIO_POR_FORMATO.keys())
    if v in valid:
        return v
    # Fuzzy match common aliases
    aliases = {
        "OOH": "OUTDOOR", "PAINEL": "OUTDOOR", "BILLBOARD": "OUTDOOR",
        "BACK": "BACKLIGHT", "FRONT": "FRONTLIGHT", "DOOH": "DIGITAL",
        "TELA": "DIGITAL", "SCREEN": "DIGITAL",
        "MOBILIARIO URBANO": "MOBILIARIO", "BUS": "BUSDOOR",
    }
    return aliases.get(v, "OUTRO")


class OohService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # CSV Upload
    # -------------------------------------------------------------------------

    async def upload_csv(
        self,
        tenant_id: uuid.UUID,
        campaign_name: str,
        advertiser: str | None,
        data_inicio: str | None,
        data_fim: str | None,
        csv_content: bytes,
    ) -> CsvUploadResult:
        """Processa CSV, cria campanha e painéis."""
        # Cria a campanha
        campaign = OohCampaign(
            tenant_id=tenant_id,
            name=campaign_name,
            advertiser=advertiser or None,
            status="PLANEJAMENTO",
        )
        if data_inicio:
            from datetime import date
            try:
                campaign.data_inicio = date.fromisoformat(data_inicio)
            except ValueError:
                pass
        if data_fim:
            from datetime import date
            try:
                campaign.data_fim = date.fromisoformat(data_fim)
            except ValueError:
                pass

        self.db.add(campaign)
        await self.db.flush()  # garante campaign.id

        # Parse CSV
        panels, skipped, errors = self._parse_csv(csv_content)

        # Cria painéis
        panel_objects = []
        for row in panels:
            formato = _normalize_formato(row.get("formato", "OUTDOOR"))
            panel = OohPanel(
                campaign_id=campaign.id,
                tenant_id=tenant_id,
                nome=row.get("nome") or None,
                codigo_operadora=row.get("codigo_operadora") or None,
                endereco=row["endereco"],
                cidade=row.get("cidade") or None,
                uf=(row.get("uf") or "").upper() or None,
                cep=row.get("cep") or None,
                formato=formato,
                largura_m=_parse_float(row.get("largura_m", "")),
                altura_m=_parse_float(row.get("altura_m", "")),
                faces=_parse_int(row.get("faces", "1")) or 1,
                digital=_parse_bool(row.get("digital", "não")),
                iluminado=_parse_bool(row.get("iluminado", "sim")),
                operadora=row.get("operadora") or None,
                fluxo_diario=_parse_int(row.get("fluxo_diario", "")),
                ots_mensal=_parse_int(row.get("ots_mensal", "")),
                valor_periodo=_parse_float(row.get("valor_periodo", "")),
                raio_visibilidade_m=RAIO_POR_FORMATO.get(formato, 200),
                geocode_status="PENDENTE",
            )
            self.db.add(panel)
            panel_objects.append(panel)

        await self.db.commit()

        return CsvUploadResult(
            campaign_id=campaign.id,
            campaign_name=campaign.name,
            paineis_importados=len(panel_objects),
            linhas_ignoradas=skipped,
            erros=errors,
            geocoding_status="pendente",
        )

    def _parse_csv(self, content: bytes) -> tuple[list[dict], int, list[str]]:
        """Lê CSV e retorna (rows, skipped_count, errors)."""
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            return [], 0, ["CSV sem cabeçalho"]

        # Normaliza cabeçalhos
        col_map = {}
        for raw in reader.fieldnames:
            normalized = HEADER_MAP.get(raw.strip().lower())
            if normalized:
                col_map[raw] = normalized

        rows, skipped, errors = [], 0, []
        for i, raw_row in enumerate(reader, start=2):
            mapped = {col_map[k]: v.strip() for k, v in raw_row.items() if k in col_map}

            if not mapped.get("endereco"):
                skipped += 1
                errors.append(f"Linha {i}: endereço obrigatório")
                continue

            rows.append(mapped)

        return rows, skipped, errors

    # -------------------------------------------------------------------------
    # Geocodificação (background task)
    # -------------------------------------------------------------------------

    async def geocode_campaign(self, campaign_id: uuid.UUID) -> dict:
        """Geocodifica todos os painéis PENDENTE de uma campanha."""
        result = await self.db.execute(
            select(OohPanel).where(
                OohPanel.campaign_id == campaign_id,
                OohPanel.geocode_status == "PENDENTE",
            )
        )
        panels = result.scalars().all()
        ok = falhou = 0

        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": USER_AGENT}) as client:
            for panel in panels:
                lat, lon = await self._geocode_panel(client, panel)
                if lat and lon:
                    panel.latitude = lat
                    panel.longitude = lon
                    panel.geocode_status = "OK"
                    panel.geocoded_at = datetime.now(timezone.utc)
                    ok += 1
                else:
                    panel.geocode_status = "FALHOU"
                    falhou += 1

                # Enriquece com IBGE
                await self._enrich_ibge(panel)

                await self.db.commit()
                await asyncio.sleep(1.1)  # Nominatim: 1 req/s

        return {"geocodificados": ok, "falhos": falhou}

    async def _geocode_panel(
        self, client: httpx.AsyncClient, panel: OohPanel
    ) -> tuple[float | None, float | None]:
        parts = [panel.endereco]
        if panel.cidade:
            parts.append(panel.cidade)
        if panel.uf:
            parts.append(panel.uf)
        parts.append("Brasil")
        query = ", ".join(parts)

        try:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": query, "format": "json", "limit": 1, "countrycodes": "br"},
            )
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception:
            pass
        return None, None

    async def _enrich_ibge(self, panel: OohPanel) -> None:
        """Busca população do município na tabela IBGE."""
        if not panel.cidade or not panel.uf:
            return

        from sqlalchemy import func as sqlfunc
        from sqlalchemy.dialects.postgresql import insert as pg_insert  # noqa

        result = await self.db.execute(
            select(Municipio).where(
                Municipio.uf == panel.uf.upper(),
                sqlfunc.lower(Municipio.nome) == panel.cidade.lower(),
            ).limit(1)
        )
        municipio = result.scalar_one_or_none()
        if municipio and municipio.populacao_2022:
            panel.populacao_municipio = municipio.populacao_2022
            # Estimativa simples: pop * proporção da área do raio
            # Usamos densidade demográfica do município como proxy
            panel.alcance_estimado = max(1000, int(municipio.populacao_2022 * 0.02))

    # -------------------------------------------------------------------------
    # Consultas
    # -------------------------------------------------------------------------

    async def list_campaigns(self, tenant_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(OohCampaign)
            .where(OohCampaign.tenant_id == tenant_id)
            .order_by(OohCampaign.created_at.desc())
        )
        campaigns = result.scalars().all()
        out = []
        for c in campaigns:
            panels_result = await self.db.execute(
                select(OohPanel).where(OohPanel.campaign_id == c.id)
            )
            panels = panels_result.scalars().all()
            geocoded = [p for p in panels if p.geocode_status == "OK"]
            alcance = sum(p.alcance_estimado or 0 for p in panels)
            fluxo = sum(p.fluxo_diario or 0 for p in panels)
            invest = sum(p.valor_periodo or 0 for p in panels)
            out.append({
                "id": c.id,
                "name": c.name,
                "advertiser": c.advertiser,
                "data_inicio": c.data_inicio,
                "data_fim": c.data_fim,
                "status": c.status,
                "total_paineis": len(panels),
                "paineis_geocodificados": len(geocoded),
                "alcance_total_estimado": alcance or None,
                "investimento_total": invest or None,
                "created_at": c.created_at,
            })
        return out

    # -------------------------------------------------------------------------
    # Share links
    # -------------------------------------------------------------------------

    async def get_or_create_share(
        self, campaign_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> OohCampaignShare | None:
        """Retorna share existente ou cria um novo para a campanha."""
        # Verifica se campanha pertence ao tenant
        result = await self.db.execute(
            select(OohCampaign).where(
                OohCampaign.id == campaign_id,
                OohCampaign.tenant_id == tenant_id,
            )
        )
        if not result.scalar_one_or_none():
            return None

        # Busca share ativo existente
        result = await self.db.execute(
            select(OohCampaignShare).where(
                OohCampaignShare.campaign_id == campaign_id,
                OohCampaignShare.is_active == True,
            )
        )
        share = result.scalar_one_or_none()

        if not share:
            share = OohCampaignShare(
                campaign_id=campaign_id,
                tenant_id=tenant_id,
            )
            self.db.add(share)
            await self.db.commit()
            await self.db.refresh(share)

        return share

    async def revoke_share(self, campaign_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(OohCampaignShare).where(
                OohCampaignShare.campaign_id == campaign_id,
                OohCampaignShare.tenant_id == tenant_id,
                OohCampaignShare.is_active == True,
            )
        )
        share = result.scalar_one_or_none()
        if share:
            share.is_active = False
            await self.db.commit()
            return True
        return False

    async def get_public_campaign(self, token: str) -> OohCampaign | None:
        """Busca campanha pelo share token — sem verificar tenant."""
        # Valida token e incrementa visualizações
        result = await self.db.execute(
            select(OohCampaignShare).where(
                OohCampaignShare.token == token,
                OohCampaignShare.is_active == True,
            )
        )
        share = result.scalar_one_or_none()
        if not share:
            return None

        share.view_count += 1
        share.last_viewed_at = datetime.now(timezone.utc)
        await self.db.commit()

        return await self.get_campaign(share.campaign_id, share.tenant_id)

    async def get_campaign(
        self, campaign_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> OohCampaign | None:
        result = await self.db.execute(
            select(OohCampaign).where(
                OohCampaign.id == campaign_id,
                OohCampaign.tenant_id == tenant_id,
            )
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            return None

        panels_result = await self.db.execute(
            select(OohPanel).where(OohPanel.campaign_id == campaign_id)
        )
        campaign.panels = panels_result.scalars().all()
        return campaign
