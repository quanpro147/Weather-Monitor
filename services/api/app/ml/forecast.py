"""
Temperature forecasting using Holt's Double Exponential Smoothing.

Rationale over plain linear regression:
- Linear polyfit extrapolates a single global trend, ignoring local momentum.
- Holt's method adapts level and trend estimates at each step, giving more
  weight to recent observations — better for short-horizon weather forecasts.
- We also return a ±1-sigma confidence band derived from in-sample residuals.

Falls back to linear regression when data has too little variance for smoothing
(constant-like series) so the endpoint always returns something useful.
"""

import datetime
import math

import numpy as np


# ── Holt's Double Exponential Smoothing ──────────────────────────────────────

def _holt_smooth(
    values: list[float],
    alpha: float = 0.4,
    beta: float = 0.2,
) -> tuple[list[float], float, float]:
    """
    Holt's linear exponential smoothing.

    Returns:
        fitted     – in-sample fitted values (same length as values)
        last_level – level at the final observation
        last_trend – trend at the final observation
    """
    level = values[0]
    trend = values[1] - values[0]
    fitted: list[float] = [level + trend]

    for v in values[1:]:
        prev_level = level
        level = alpha * v + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
        fitted.append(level + trend)

    return fitted, level, trend


def _linear_extrapolate(values: list[float], days_ahead: int) -> tuple[list[float], float]:
    """Fallback: NumPy linear regression + residual std."""
    x = np.arange(len(values))
    coeffs = np.polyfit(x, values, 1)
    poly = np.poly1d(coeffs)

    start = len(values)
    preds = [float(poly(start + i)) for i in range(days_ahead)]
    fitted = [float(poly(xi)) for xi in x]
    residual_std = float(np.std(np.array(values) - np.array(fitted)))
    return preds, residual_std


# ── Public API ────────────────────────────────────────────────────────────────

def forecast_temperature(
    records: list[dict],
    days_ahead: int = 7,
    alpha: float = 0.4,
    beta: float = 0.2,
) -> list[dict]:
    """
    Forecast daily mean temperature for the next `days_ahead` days.

    Parameters
    ----------
    records    : list of dicts with at least "date" and "temperature_2m_mean"
    days_ahead : number of future days to forecast (default 7)
    alpha      : Holt level smoothing factor (0–1)
    beta       : Holt trend smoothing factor (0–1)

    Returns
    -------
    List of dicts with:
        date                    – ISO date string
        predicted_temperature   – point forecast (°C)
        confidence_lower        – forecast - 1σ
        confidence_upper        – forecast + 1σ
        method                  – "holt" or "linear" (fallback)
    """
    if len(records) < 30:
        return []

    records = sorted(records, key=lambda r: r["date"])
    values = [float(r.get("temperature_2m_mean", 0) or 0) for r in records]

    last_date = datetime.date.fromisoformat(records[-1]["date"])
    method = "holt"

    # Detect near-constant series (variance < 0.01°C²) — Holt is unstable there
    if float(np.var(values)) < 0.01:
        preds, sigma = _linear_extrapolate(values, days_ahead)
        method = "linear"
    else:
        fitted, last_level, last_trend = _holt_smooth(values, alpha=alpha, beta=beta)
        residuals = np.array(values) - np.array(fitted)
        sigma = float(np.std(residuals))

        preds = []
        for h in range(1, days_ahead + 1):
            preds.append(last_level + h * last_trend)

    results: list[dict] = []
    for i, pred in enumerate(preds):
        future_date = last_date + datetime.timedelta(days=i + 1)
        results.append({
            "date": str(future_date),
            "predicted_temperature": round(pred, 2),
            "confidence_lower": round(pred - sigma, 2),
            "confidence_upper": round(pred + sigma, 2),
            "method": method,
        })

    return results


def compute_trend_summary(records: list[dict]) -> dict:
    """
    Compute a short trend summary over the supplied records.

    Returns a dict with:
        direction     – "warming" | "cooling" | "stable"
        slope_per_day – °C change per day (linear fit)
        period_days   – number of days analysed
        mean_temp     – mean temperature over period
        temp_range    – max - min temperature
    """
    if len(records) < 7:
        return {"direction": "stable", "slope_per_day": 0.0, "period_days": len(records)}

    records = sorted(records, key=lambda r: r["date"])
    values = np.array([float(r.get("temperature_2m_mean", 0) or 0) for r in records])
    x = np.arange(len(values))
    slope, _ = np.polyfit(x, values, 1)

    if slope > 0.05:
        direction = "warming"
    elif slope < -0.05:
        direction = "cooling"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "slope_per_day": round(float(slope), 4),
        "period_days": len(records),
        "mean_temp": round(float(values.mean()), 2),
        "temp_range": round(float(values.max() - values.min()), 2),
    }
