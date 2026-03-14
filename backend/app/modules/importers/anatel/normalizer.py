from app.modules.vehicles.enums import CoverageScope, MediaSegment, VehicleStatus, VehicleType

SERVICE_TO_TYPE: dict[str, VehicleType] = {
    "FM": VehicleType.RADIO,
    "RTRFM": VehicleType.RADIO,
    "OM": VehicleType.RADIO,
    "OT": VehicleType.RADIO,
    "ECRD": VehicleType.RADIO,
    "TV": VehicleType.TV_ABERTA,
    "TVA": VehicleType.TV_ABERTA,
    "RTVD": VehicleType.TV_ABERTA,
    "RTV": VehicleType.TV_ABERTA,
    "PBTVD": VehicleType.TV_ABERTA,
    "GTVD": VehicleType.TV_ABERTA,
}

FINALIDADE_TO_SEGMENT: dict[str, MediaSegment] = {
    "Comercial": MediaSegment.GENERALISTA,
    "Educativo": MediaSegment.EDUCACAO,
    "Religioso": MediaSegment.RELIGIOSO,
    "Público": MediaSegment.GENERALISTA,
    "Comunitário": MediaSegment.GENERALISTA,
    "Privado": MediaSegment.GENERALISTA,
}


def normalize_row(row: dict) -> dict | None:
    """
    Converte uma linha do CSV da ANATEL para o formato de Vehicle.
    Retorna None se o registro deve ser ignorado.
    """
    entidade = row.get("Entidade", "").strip()
    sigla_servico = row.get("SiglaServico", "").strip()
    status_desc = row.get("Status Descrição", "").strip()
    uf = row.get("srd_planobasico_SiglaUF", "").strip()
    municipio = row.get("srd_planobasico_NomeMunicipio", "").strip()
    fistel = row.get("NumFistel", "").strip()

    # Pular canais vagos ou sem entidade/fistel
    if not entidade or not fistel or status_desc == "Canal Vago":
        return None

    vehicle_type = SERVICE_TO_TYPE.get(sigla_servico)
    if not vehicle_type:
        return None

    status = VehicleStatus.ATIVO if status_desc == "Canal Licenciado" else VehicleStatus.INATIVO

    finalidade = row.get("Finalidade", "").strip()
    segment = FINALIDADE_TO_SEGMENT.get(finalidade, MediaSegment.GENERALISTA)

    slug = f"anatel-{fistel}"

    coverage_states = [uf] if uf else []
    coverage_cities = [municipio] if municipio else []

    metadata: dict = {
        "fonte": "ANATEL",
        "fistel": fistel,
        "sigla_servico": sigla_servico,
        "carater": row.get("Caráter", "").strip(),
        "categoria": row.get("Categoria da Estação", "").strip(),
    }

    for field, key in [
        ("Frequência", "frequencia_mhz"),
        ("Canal", "canal"),
        ("ERP", "erp_watts"),
        ("HCI", "hci_km"),
        ("Classe", "classe"),
        ("Latitude Decimal SRD", "latitude"),
        ("Longitude Decimal SRD", "longitude"),
        ("sei_NumProcesso", "processo_sei"),
    ]:
        val = row.get(field, "").strip()
        if val:
            metadata[key] = val

    cnpj_raw = row.get("CNPJ", "").strip()
    cnpj = cnpj_raw if len(cnpj_raw) >= 11 else None

    return {
        "name": entidade[:300],
        "slug": slug[:300],
        "vehicle_type": vehicle_type,
        "segment": segment,
        "status": status,
        "coverage_scope": CoverageScope.LOCAL,
        "coverage_states": coverage_states,
        "coverage_cities": coverage_cities,
        "parent_company": entidade[:300],
        "cnpj": cnpj,
        "extra_metadata": metadata,
        "is_verified": False,
    }
