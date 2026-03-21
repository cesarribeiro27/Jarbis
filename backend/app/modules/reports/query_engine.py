"""
Motor de Query v2 — Jarbis

Aceita um QueryRequest estruturado e executa contra os dados do dataset
armazenados como JSONB, retornando dados normalizados para qualquer tipo
de visualização.

Suporta:
- Múltiplos filtros com operadores variados
- Granularidade de data (dia, semana, mês, trimestre, ano)
- Múltiplas métricas por consulta
- Ordenação e limite
- Comparação de período (período atual vs anterior)
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Modelos do contrato de query
# ---------------------------------------------------------------------------


class QueryDimension(BaseModel):
    column: str
    type: Literal["text", "date", "number"] = "text"
    granularity: Literal["day", "week", "month", "quarter", "year"] | None = None
    alias: str | None = None


class QueryMetric(BaseModel):
    column: str
    aggregation: Literal["sum", "count", "count_distinct", "avg", "min", "max", "none"] = "sum"
    alias: str | None = None


class QueryFilter(BaseModel):
    column: str
    operator: Literal["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "not_null"] = "eq"
    value: Any = None


class QueryDateRange(BaseModel):
    column: str
    from_date: str | None = Field(default=None, alias="from")
    to_date: str | None = Field(default=None, alias="to")

    model_config = {"populate_by_name": True}


class QuerySort(BaseModel):
    column: str
    direction: Literal["asc", "desc"] = "desc"


class QueryRequest(BaseModel):
    dimensions: list[QueryDimension] = []
    metrics: list[QueryMetric] = []
    filters: list[QueryFilter] = []
    date_range: QueryDateRange | None = None
    sort: list[QuerySort] = []
    limit: int | None = None
    compare_previous_period: bool = False


class QueryResult(BaseModel):
    data: list[dict[str, Any]]
    total_rows: int
    columns: list[str]
    compare_data: list[dict[str, Any]] | None = None


# ---------------------------------------------------------------------------
# Utilitários de parsing
# ---------------------------------------------------------------------------


def _parse_date(v: Any) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except ValueError:
            continue
    return None


def _to_float(v: Any) -> float:
    import math
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        f = float(v)
        return 0.0 if math.isnan(f) or math.isinf(f) else f
    try:
        f = float(str(v).strip().replace(",", ".").replace(" ", ""))
        return 0.0 if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return 0.0


def _date_granularity_key(d: date, granularity: str | None) -> str:
    if not granularity or granularity == "day":
        return d.strftime("%Y-%m-%d")
    if granularity == "week":
        iso = d.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    if granularity == "month":
        return d.strftime("%Y-%m")
    if granularity == "quarter":
        q = (d.month - 1) // 3 + 1
        return f"{d.year}-Q{q}"
    if granularity == "year":
        return str(d.year)
    return d.strftime("%Y-%m-%d")


def _date_granularity_label(d: date, granularity: str | None) -> str:
    """Rótulo legível para datas."""
    MONTHS_PT = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                 "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    MONTHS_FULL_PT = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    if not granularity or granularity == "day":
        return d.strftime("%d/%m/%Y")
    if granularity == "week":
        iso = d.isocalendar()
        return f"Sem {iso[1]:02d}/{d.year}"
    if granularity == "month":
        return f"{MONTHS_PT[d.month]}/{str(d.year)[2:]}"
    if granularity == "quarter":
        q = (d.month - 1) // 3 + 1
        return f"T{q}/{d.year}"
    if granularity == "year":
        return str(d.year)
    return d.strftime("%d/%m/%Y")


# ---------------------------------------------------------------------------
# Avaliação de filtros
# ---------------------------------------------------------------------------


def _apply_filter(row: dict, f: QueryFilter) -> bool:
    raw = row.get(f.column)
    op = f.operator

    if op == "not_null":
        return raw is not None and raw != ""

    val = f.value

    if op == "eq":
        return str(raw) == str(val) if val is not None else raw is None
    if op == "neq":
        return str(raw) != str(val)
    if op == "in":
        if not isinstance(val, list):
            val = [val]
        return str(raw) in [str(v) for v in val]
    if op == "not_in":
        if not isinstance(val, list):
            val = [val]
        return str(raw) not in [str(v) for v in val]
    if op == "contains":
        return str(val).lower() in str(raw).lower() if raw is not None else False
    # Numeric comparisons
    try:
        num_raw = _to_float(raw)
        num_val = _to_float(val)
        if op == "gt":  return num_raw > num_val
        if op == "gte": return num_raw >= num_val
        if op == "lt":  return num_raw < num_val
        if op == "lte": return num_raw <= num_val
    except (TypeError, ValueError):
        pass
    return True


def _apply_date_range(rows: list[dict], dr: QueryDateRange) -> list[dict]:
    d_from = _parse_date(dr.from_date)
    d_to = _parse_date(dr.to_date)
    if not d_from and not d_to:
        return rows
    result = []
    for row in rows:
        rd = _parse_date(row.get(dr.column))
        if rd is None:
            continue
        if d_from and rd < d_from:
            continue
        if d_to and rd > d_to:
            continue
        result.append(row)
    return result


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _aggregate_groups(
    groups: dict[str, dict[str, list[float]]],
    metrics: list[QueryMetric],
    dim_labels: dict[str, str],
) -> list[dict[str, Any]]:
    """Converte grupos acumulados em lista de dicts com valores agregados."""
    result = []
    for key, metric_values in groups.items():
        row: dict[str, Any] = {"label": dim_labels.get(key, key), "_key": key}
        for m in metrics:
            col_key = m.column
            values = metric_values.get(col_key, [])
            agg = m.aggregation
            if agg == "sum":
                v = sum(values)
            elif agg == "avg":
                v = sum(values) / len(values) if values else 0.0
            elif agg == "count":
                v = float(len(values))
            elif agg == "count_distinct":
                # Para count_distinct, guardamos os valores originais como strings
                v = float(len(set(str(x) for x in values)))
            elif agg == "max":
                v = max(values) if values else 0.0
            elif agg == "min":
                v = min(values) if values else 0.0
            else:  # none — primeiro valor
                v = values[0] if values else 0.0

            alias = m.alias or (col_key if col_key != "__count__" else "count")
            # Primeiro métrica = "value" para compatibilidade com gráficos
            if not any(k == "value" for k in row):
                row["value"] = round(v, 4)
            row[alias] = round(v, 4)

        result.append(row)
    return result


# ---------------------------------------------------------------------------
# Motor principal
# ---------------------------------------------------------------------------


def execute_query(rows: list[dict], req: QueryRequest) -> QueryResult:
    """
    Executa a QueryRequest contra os rows do dataset.
    Retorna QueryResult com data normalizada.
    """
    if not rows:
        return QueryResult(data=[], total_rows=0, columns=[])

    # 1. Aplicar filtros de valor
    filtered = rows
    for f in req.filters:
        filtered = [r for r in filtered if _apply_filter(r, f)]

    # 2. Aplicar filtro de data
    if req.date_range:
        filtered = _apply_date_range(filtered, req.date_range)

    if not filtered:
        return QueryResult(data=[], total_rows=0, columns=[])

    # 3. Determinar dimensão principal (primeira da lista) e dimensões extras
    dim = req.dimensions[0] if req.dimensions else None
    extra_dims = req.dimensions[1:] if len(req.dimensions) > 1 else []

    # 4. Agrupar e agregar
    groups: dict[str, dict[str, list]] = {}  # key -> {col -> [values]}
    dim_labels: dict[str, str] = {}  # key -> label legível
    extra_dim_vals: dict[str, dict[str, str]] = {}  # key -> {extra_col: value}

    for row in filtered:
        # Calcular chave de agrupamento (dimensão principal)
        if dim is None:
            key = "_total_"
            label = "Total"
        elif dim.type == "date":
            d = _parse_date(row.get(dim.column))
            if d is None:
                key = "(sem data)"
                label = "(sem data)"
            else:
                key = _date_granularity_key(d, dim.granularity)
                label = _date_granularity_label(d, dim.granularity)
        else:
            raw = row.get(dim.column)
            key = str(raw) if raw is not None else "(vazio)"
            label = key

        # Se há dimensões extras, incluir no agrupamento composto
        if extra_dims:
            extra_parts = []
            for ed in extra_dims:
                ev = str(row.get(ed.column, "")) if row.get(ed.column) is not None else "(vazio)"
                extra_parts.append(ev)
            key = key + "\x00" + "\x00".join(extra_parts)

        dim_labels[key] = label

        # Guardar valores das dimensões extras para incluir no resultado
        if extra_dims and key not in extra_dim_vals:
            extra_dim_vals[key] = {}
            for ed in extra_dims:
                ev = str(row.get(ed.column, "")) if row.get(ed.column) is not None else "(vazio)"
                extra_dim_vals[key][ed.column] = ev

        if key not in groups:
            groups[key] = {m.column: [] for m in req.metrics}

        for m in req.metrics:
            col = m.column
            if col == "__count__":
                groups[key][col].append(1)
            else:
                raw_val = row.get(col)
                groups[key][col].append(raw_val if m.aggregation == "count_distinct" else _to_float(raw_val))

    # 5. Converter grupos em resultado
    data = _aggregate_groups(groups, req.metrics, dim_labels)

    # 6. Ordenar
    for sort in reversed(req.sort):
        col = sort.column
        reverse = sort.direction == "desc"
        if col == dim.column if dim else False:
            data.sort(key=lambda r: r.get("_key", ""), reverse=reverse)
        else:
            data.sort(key=lambda r: r.get(col, r.get("value", 0)) or 0, reverse=reverse)

    # 7. Ordenação natural de datas (se dimensão de data e sem sort explícito)
    if dim and dim.type == "date" and not req.sort:
        data.sort(key=lambda r: r.get("_key", ""))

    # 8. Limit
    total = len(data)
    if req.limit and req.limit > 0:
        data = data[:req.limit]

    # 9. Adicionar colunas de dimensões extras e limpar _key interno
    for r in data:
        if extra_dims:
            composite_key = r.get("_key", "")
            ev = extra_dim_vals.get(composite_key, {})
            for ed in extra_dims:
                r[ed.column] = ev.get(ed.column, "")
        r.pop("_key", None)

    # 10. Comparação de período anterior (opcional)
    compare_data = None
    if req.compare_previous_period and req.date_range and req.date_range.from_date and req.date_range.to_date:
        compare_data = _execute_compare_period(rows, req)

    columns = [dim.alias or dim.column if dim else "label"] + [m.alias or m.column for m in req.metrics]

    return QueryResult(data=data, total_rows=total, columns=columns, compare_data=compare_data)


def _execute_compare_period(rows: list[dict], req: QueryRequest) -> list[dict]:
    """Executa a mesma query para o período anterior e retorna os dados."""
    from datetime import timedelta

    dr = req.date_range
    d_from = _parse_date(dr.from_date)
    d_to = _parse_date(dr.to_date)
    if not d_from or not d_to:
        return []

    delta = (d_to - d_from).days + 1
    prev_from = d_from - timedelta(days=delta)
    prev_to = d_to - timedelta(days=delta)

    prev_req = req.model_copy(deep=True)
    prev_req.date_range = QueryDateRange(**{
        "from": prev_from.isoformat(),
        "to": prev_to.isoformat(),
        "column": dr.column,
    })
    prev_req.compare_previous_period = False

    result = execute_query(rows, prev_req)
    return result.data


# ---------------------------------------------------------------------------
# Detecção de tipos de coluna
# ---------------------------------------------------------------------------

DATE_PATTERNS = [
    re.compile(r"^\d{4}-\d{2}-\d{2}"),
    re.compile(r"^\d{2}/\d{2}/\d{4}"),
    re.compile(r"^\d{2}/\d{2}/\d{2}$"),
]


def detect_column_types(rows: list[dict], sample_size: int = 50) -> dict[str, str]:
    """
    Detecta o tipo de cada coluna com base em amostra de linhas.
    Retorna dict {coluna: tipo} onde tipo é 'text' | 'number' | 'date'
    """
    if not rows:
        return {}

    sample = rows[:sample_size]
    columns = list(rows[0].keys())
    result = {}

    for col in columns:
        values = [r.get(col) for r in sample if r.get(col) is not None and r.get(col) != ""]
        if not values:
            result[col] = "text"
            continue

        # Já é número nativo
        if all(isinstance(v, (int, float)) for v in values):
            result[col] = "number"
            continue

        # Testar se parece data
        str_vals = [str(v).strip() for v in values]
        date_matches = sum(1 for v in str_vals if any(p.match(v) for p in DATE_PATTERNS))
        if date_matches / len(str_vals) >= 0.7:
            result[col] = "date"
            continue

        # Testar se é numérico como string
        num_matches = 0
        for v in str_vals:
            try:
                float(v.replace(",", ".").replace(" ", ""))
                num_matches += 1
            except ValueError:
                pass
        if num_matches / len(str_vals) >= 0.8:
            result[col] = "number"
            continue

        result[col] = "text"

    return result
