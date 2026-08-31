from __future__ import annotations

import json
import math
import re
import sys
from datetime import date
from typing import Any

import pandas as pd


SUPPORTED_UNITS = {"TON", "KILOGRAM", "CUBIC_METER", "UNIT"}
MASS_UNITS = {"TON", "KILOGRAM"}
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class AnalysisInputError(ValueError):
    """Raised when analytics input would produce a misleading result."""


def _parse_iso_date(value: Any, field_name: str) -> date:
    if not isinstance(value, str) or not ISO_DATE_PATTERN.fullmatch(value):
        raise AnalysisInputError(f"{field_name} YYYY-MM-DD biçiminde olmalıdır.")

    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise AnalysisInputError(f"{field_name} geçerli bir tarih olmalıdır.") from error


def _parse_unit(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise AnalysisInputError(f"{field_name} geçerli bir ölçü birimi olmalıdır.")

    unit = value.strip().upper()
    if unit not in SUPPORTED_UNITS:
        allowed = ", ".join(sorted(SUPPORTED_UNITS))
        raise AnalysisInputError(f"{field_name} şu değerlerden biri olmalıdır: {allowed}.")

    return unit


def _parse_quantity(value: Any, row_number: int) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise AnalysisInputError(f"{row_number}. kaydın miktarı sayısal olmalıdır.")

    quantity = float(value)
    if not math.isfinite(quantity) or quantity < 0:
        raise AnalysisInputError(
            f"{row_number}. kaydın miktarı sıfır veya daha büyük olmalıdır."
        )

    return quantity


def _convert_quantity(quantity: float, source_unit: str, output_unit: str) -> float:
    if source_unit == output_unit:
        return quantity

    if {source_unit, output_unit}.issubset(MASS_UNITS):
        return quantity * 1_000 if source_unit == "TON" else quantity / 1_000

    raise AnalysisInputError(
        f"{source_unit} birimi {output_unit} birimine dönüştürülemez; "
        "farklı boyutlardaki ölçüler aynı seride toplanamaz."
    )


def prepare_daily_series(payload: dict[str, Any]) -> dict[str, Any]:
    records = payload.get("records")
    if not isinstance(records, list):
        raise AnalysisInputError("records alanı bir liste olmalıdır.")

    output_unit_value = payload.get("output_unit")
    output_unit = (
        _parse_unit(output_unit_value, "output_unit")
        if output_unit_value is not None
        else None
    )

    parsed_records: list[dict[str, Any]] = []
    detected_units: set[str] = set()

    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            raise AnalysisInputError(f"{index}. kayıt bir nesne olmalıdır.")

        record_date = _parse_iso_date(record.get("date"), f"{index}. kaydın tarihi")
        unit = _parse_unit(record.get("unit"), f"{index}. kaydın birimi")
        quantity = _parse_quantity(record.get("quantity"), index)
        detected_units.add(unit)
        parsed_records.append(
            {"date": record_date.isoformat(), "quantity": quantity, "unit": unit}
        )

    if output_unit is None:
        if len(detected_units) > 1:
            raise AnalysisInputError(
                "Birden fazla ölçü birimi bulundu; output_unit açıkça belirtilmelidir."
            )
        if len(detected_units) == 1:
            output_unit = next(iter(detected_units))
        else:
            raise AnalysisInputError(
                "Kayıt bulunmadığında output_unit açıkça belirtilmelidir."
            )

    for record in parsed_records:
        record["quantity"] = _convert_quantity(
            record["quantity"], record["unit"], output_unit
        )

    requested_start = payload.get("start_date")
    requested_end = payload.get("end_date")
    start_date = (
        _parse_iso_date(requested_start, "start_date")
        if requested_start is not None
        else None
    )
    end_date = (
        _parse_iso_date(requested_end, "end_date")
        if requested_end is not None
        else None
    )

    record_dates = [date.fromisoformat(record["date"]) for record in parsed_records]
    if start_date is None:
        if not record_dates:
            raise AnalysisInputError(
                "Kayıt bulunmadığında start_date açıkça belirtilmelidir."
            )
        start_date = min(record_dates)
    if end_date is None:
        if not record_dates:
            raise AnalysisInputError(
                "Kayıt bulunmadığında end_date açıkça belirtilmelidir."
            )
        end_date = max(record_dates)

    if end_date < start_date:
        raise AnalysisInputError("end_date, start_date tarihinden önce olamaz.")

    outside_range = [
        record_date
        for record_date in record_dates
        if record_date < start_date or record_date > end_date
    ]
    if outside_range:
        raise AnalysisInputError(
            "Kayıtlardan en az biri istenen tarih aralığının dışında kalıyor."
        )

    calendar = pd.DataFrame(
        {
            "date": pd.date_range(
                start=start_date.isoformat(), end=end_date.isoformat(), freq="D"
            )
        }
    )

    if parsed_records:
        observed = pd.DataFrame(parsed_records)
        observed["date"] = pd.to_datetime(observed["date"], format="%Y-%m-%d")
        daily = (
            observed.groupby("date", as_index=False, sort=True)
            .agg(quantity=("quantity", "sum"), record_count=("quantity", "size"))
        )
        daily["quantity"] = daily["quantity"].round(6)
        series = calendar.merge(daily, on="date", how="left", validate="one_to_one")
    else:
        series = calendar.assign(quantity=float("nan"), record_count=float("nan"))

    points: list[dict[str, Any]] = []
    for row in series.itertuples(index=False):
        is_missing = pd.isna(row.quantity)
        points.append(
            {
                "date": row.date.strftime("%Y-%m-%d"),
                "quantity": None if is_missing else float(row.quantity),
                "is_missing": bool(is_missing),
                "record_count": 0 if is_missing else int(row.record_count),
            }
        )

    missing_day_count = sum(1 for point in points if point["is_missing"])
    observed_points = [point for point in points if not point["is_missing"]]

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "unit": output_unit,
        "calendar_day_count": len(points),
        "observed_day_count": len(observed_points),
        "missing_day_count": missing_day_count,
        "total_quantity": round(
            sum(
                point["quantity"]
                for point in observed_points
                if point["quantity"] is not None
            ),
            6,
        ),
        "points": points,
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise AnalysisInputError("Girdi bir JSON nesnesi olmalıdır.")
        result = prepare_daily_series(payload)
        json.dump(result, sys.stdout, ensure_ascii=False, allow_nan=False)
        sys.stdout.write("\n")
        return 0
    except (AnalysisInputError, json.JSONDecodeError) as error:
        json.dump({"error": str(error)}, sys.stderr, ensure_ascii=False)
        sys.stderr.write("\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
