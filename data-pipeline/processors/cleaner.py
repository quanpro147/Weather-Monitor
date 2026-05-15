"""
Data cleaning pipeline for Weather-Monitor.

Handles:
- Duplicate removal (same city_id + date)
- Missing value imputation (forward-fill → backward-fill → column median)
- Outlier detection and capping (IQR method, per column)
- Data quality report generation
"""

import logging
from typing import Any

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# All numeric columns present in public.weather_daily (excluding id, city_id, date, weather_code)
WEATHER_NUMERIC_COLS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "rain_sum",
    "shortwave_radiation_sum",
    "wind_direction_10m_dominant",
    "wind_speed_10m_max",
    "wind_speed_10m_mean",
    "wind_gusts_10m_max",
    "wind_gusts_10m_mean",
    "relative_humidity_2m_max",
    "relative_humidity_2m_min",
    "relative_humidity_2m_mean",
    "cloud_cover_max",
    "cloud_cover_min",
    "cloud_cover_mean",
]

# Hard physical bounds — values outside these are physically impossible and should be nulled
PHYSICAL_BOUNDS: dict[str, tuple[float, float]] = {
    "temperature_2m_max":          (-20.0,   55.0),
    "temperature_2m_min":          (-20.0,   55.0),
    "temperature_2m_mean":         (-20.0,   55.0),
    "rain_sum":                    (  0.0, 1500.0),
    "shortwave_radiation_sum":     (  0.0,   40.0),
    "wind_direction_10m_dominant": (  0.0,  360.0),
    "wind_speed_10m_max":          (  0.0,  200.0),
    "wind_speed_10m_mean":         (  0.0,  200.0),
    "wind_gusts_10m_max":          (  0.0,  300.0),
    "wind_gusts_10m_mean":         (  0.0,  300.0),
    "relative_humidity_2m_max":    (  0.0,  100.0),
    "relative_humidity_2m_min":    (  0.0,  100.0),
    "relative_humidity_2m_mean":   (  0.0,  100.0),
    "cloud_cover_max":             (  0.0,  100.0),
    "cloud_cover_min":             (  0.0,  100.0),
    "cloud_cover_mean":            (  0.0,  100.0),
}


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Drop rows where (city_id, date) is duplicated — keep the last entry."""
    before = len(df)
    df = df.drop_duplicates(subset=["city_id", "date"], keep="last")
    removed = before - len(df)
    if removed:
        logger.info("Duplicates removed: %d rows", removed)
    return df, removed


def null_impossible_values(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Replace values outside physical bounds with NaN."""
    total_nulled = 0
    for col, (lo, hi) in PHYSICAL_BOUNDS.items():
        if col not in df.columns:
            continue
        mask = df[col].notna() & ((df[col] < lo) | (df[col] > hi))
        count = int(mask.sum())
        if count:
            df = df.copy()
            df.loc[mask, col] = float("nan")
            logger.info("Nulled %d impossible values in '%s'", count, col)
            total_nulled += count
    return df, total_nulled


def cap_outliers_iqr(df: pd.DataFrame, multiplier: float = 2.5) -> tuple[pd.DataFrame, int]:
    """
    Cap statistical outliers per column using IQR fencing.
    Values below Q1 - k*IQR or above Q3 + k*IQR are capped (Winsorized),
    not removed, to preserve time-series continuity.
    """
    total_capped = 0
    for col in WEATHER_NUMERIC_COLS:
        if col not in df.columns:
            continue
        series = df[col].dropna()
        if len(series) < 10:
            continue
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower = q1 - multiplier * iqr
        upper = q3 + multiplier * iqr
        if col in PHYSICAL_BOUNDS:
            lower = max(lower, PHYSICAL_BOUNDS[col][0])
            upper = min(upper, PHYSICAL_BOUNDS[col][1])
        mask = df[col].notna() & ((df[col] < lower) | (df[col] > upper))
        count = int(mask.sum())
        if count:
            df = df.copy()
            df.loc[df[col] < lower, col] = lower
            df.loc[df[col] > upper, col] = upper
            logger.info("Capped %d outliers in '%s' [%.2f, %.2f]", count, col, lower, upper)
            total_capped += count
    return df, total_capped


def impute_missing(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """
    Three-stage imputation (within each city group to avoid cross-city contamination):
      1. Forward-fill (propagate last known value)
      2. Backward-fill (fill any leading NaNs)
      3. Column median fallback (if an entire city's column is NaN)
    """
    existing_cols = [c for c in WEATHER_NUMERIC_COLS if c in df.columns]
    before_nulls = int(df[existing_cols].isnull().sum().sum()) if existing_cols else 0

    df = df.sort_values(["city_id", "date"])

    df[existing_cols] = (
        df.groupby("city_id")[existing_cols]
        .transform(lambda g: g.ffill().bfill())
    )

    for col in existing_cols:
        if df[col].isnull().any():
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            logger.info("Median-filled remaining NaNs in '%s' with %.3f", col, median_val)

    after_nulls = int(df[existing_cols].isnull().sum().sum())
    imputed = before_nulls - after_nulls
    if imputed:
        logger.info("Imputed %d missing values", imputed)
    return df, imputed


def quality_report(df: pd.DataFrame) -> dict[str, Any]:
    """Return a data-quality summary dict (useful for logging / dashboards)."""
    existing_cols = [c for c in WEATHER_NUMERIC_COLS if c in df.columns]
    total_cells = len(df) * len(existing_cols)
    missing_cells = int(df[existing_cols].isnull().sum().sum())
    completeness = round((1 - missing_cells / total_cells) * 100, 2) if total_cells else 100.0

    return {
        "total_rows": len(df),
        "total_cities": int(df["city_id"].nunique()) if "city_id" in df.columns else 0,
        "date_range": {
            "start": str(df["date"].min()) if "date" in df.columns else None,
            "end": str(df["date"].max()) if "date" in df.columns else None,
        },
        "completeness_pct": completeness,
        "missing_cells": missing_cells,
        "per_column_missing": {col: int(df[col].isnull().sum()) for col in existing_cols},
    }


def clean(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Run the full cleaning pipeline and return (cleaned_df, report).

    Steps:
      1. Remove duplicates
      2. Null physically impossible values
      3. Impute missing values
      4. Cap statistical outliers (after imputation to avoid inflating medians)
    """
    stats: dict[str, Any] = {}

    df, stats["duplicates_removed"] = remove_duplicates(df)
    df, stats["impossible_values_nulled"] = null_impossible_values(df)
    df, stats["missing_imputed"] = impute_missing(df)
    df, stats["outliers_capped"] = cap_outliers_iqr(df)

    report = quality_report(df)
    report["cleaning_stats"] = stats

    logger.info(
        "Cleaning complete — rows: %d, completeness: %.1f%%",
        report["total_rows"],
        report["completeness_pct"],
    )
    return df, report


def _write_back(df: pd.DataFrame, conn) -> int:
    """
    Write the cleaned DataFrame back to public.weather_daily via psycopg2.
    Uses UPDATE per row identified by (city_id, date).
    Returns the number of rows updated.
    """
    update_cols = [c for c in WEATHER_NUMERIC_COLS if c in df.columns]
    set_clause = ", ".join(f"{col} = %s" for col in update_cols)
    sql = f"UPDATE public.weather_daily SET {set_clause} WHERE city_id = %s AND date = %s"

    rows_updated = 0
    with conn.cursor() as cur:
        for _, row in df.iterrows():
            values = [
                None if pd.isna(row[col]) else row[col]
                for col in update_cols
            ]
            values.extend([int(row["city_id"]), str(row["date"])])
            cur.execute(sql, values)
            rows_updated += cur.rowcount
    conn.commit()
    return rows_updated


# ── CLI entry-point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    import json
    import psycopg2
    from dotenv import load_dotenv

    load_dotenv()

    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ["DB_NAME"],
    )

    logger.info("Loading data from database...")
    raw_df = pd.read_sql("SELECT * FROM public.weather_daily", conn)

    cleaned_df, report = clean(raw_df)

    logger.info("Writing cleaned data back to database...")
    updated = _write_back(cleaned_df, conn)
    conn.close()

    report["rows_written_back"] = updated
    print("\n=== DATA QUALITY REPORT ===")
    print(json.dumps(report, indent=2, default=str))
