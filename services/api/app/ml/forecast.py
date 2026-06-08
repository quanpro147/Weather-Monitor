"""
Temperature forecasting using Holt-Winters Triple Exponential Smoothing.

Rationale:
- Holt-Winters introduces a seasonal component (weekly period=7) to capture realistic up-and-down oscillations in weather, which is more convincing than a straight linear trend.
- We also return a ±1-sigma confidence band derived from in-sample residuals.
- Falls back to Holt's Double Exponential Smoothing or Linear Regression when statsmodels fails or data has too little variance.
"""

import datetime
import math
import warnings

import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing


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


def _clean_outliers(values: list[float], threshold: float = 2.5) -> list[float]:
    """
    Detect and impute 1D temperature outliers using Z-score.
    Outliers are replaced with the average of neighboring points to avoid distorting the forecast.
    """
    if len(values) < 5:
        return values

    arr = np.array(values)
    mean = np.mean(arr)
    std = np.std(arr)

    if std < 0.1:
        return values

    cleaned = list(values)
    for i in range(len(values)):
        z = abs(values[i] - mean) / std
        if z > threshold:
            if i > 0 and i < len(values) - 1:
                cleaned[i] = (cleaned[i-1] + cleaned[i+1]) / 2.0
            elif i == 0:
                cleaned[i] = cleaned[1]
            else:
                cleaned[i] = cleaned[i-1]
    return cleaned


# ── Public API ────────────────────────────────────────────────────────────────

def forecast_temperature(
    records: list[dict],
    days_ahead: int = 7,
    alpha: float = 0.4,
    beta: float = 0.2,
) -> list[dict]:
    """
    Forecast daily mean temperature for the next `days_ahead` days.
    Uses Seasonal ARIMA (SARIMA) with weekly seasonality (order=(1, 0, 1), seasonal_order=(1, 0, 1, 7))
    to generate realistic, oscillating weather forecasts.
    Cleans/imputes historical outliers before fitting the model to prevent distortion.
    Falls back to Holt-Winters, Holt's Double Exponential Smoothing, or Linear Regression in case of failure.
    """
    if len(records) < 30:
        return []

    records = sorted(records, key=lambda r: r["date"])
    values = [float(r.get("temperature_2m_mean", 0) or 0) for r in records]
    cleaned_values = _clean_outliers(values)

    last_date = datetime.date.fromisoformat(records[-1]["date"])
    method = "arima"

    # Detect near-constant series (variance < 0.01°C²) — ARIMA is unstable there
    if float(np.var(cleaned_values)) < 0.01:
        preds, std_val = _linear_extrapolate(cleaned_values, days_ahead)
        sigma = [std_val] * days_ahead
        method = "linear"
    else:
        try:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore")
                # Fit ARIMA with weekly seasonality (SARIMAX)
                model = ARIMA(cleaned_values, order=(1, 0, 1), seasonal_order=(1, 0, 1, 7))
                fit_model = model.fit()
                
                # Forecast
                forecast_res = fit_model.get_forecast(days_ahead)
                preds = [float(p) for p in forecast_res.predicted_mean]
                sigma = [float(s) for s in forecast_res.se_mean]
        except Exception as arima_err:
            # Fallback 1: Holt-Winters (Triple Exponential Smoothing)
            try:
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore")
                    model = ExponentialSmoothing(
                        cleaned_values,
                        trend="add",
                        seasonal="add",
                        seasonal_periods=7,
                        initialization_method="estimated"
                    )
                    fit_model = model.fit()
                    predictions_raw = fit_model.forecast(days_ahead)
                    preds = [float(p) for p in predictions_raw]
                    
                    fitted = fit_model.fittedvalues
                    residuals = np.array(cleaned_values) - np.array(fitted)
                    std_val = float(np.std(residuals))
                    sigma = [std_val] * days_ahead
                    method = "holt-winters"
            except Exception as hw_err:
                # Fallback 2: Holt's Double Exponential Smoothing if Holt-Winters fails
                try:
                    fitted, last_level, last_trend = _holt_smooth(cleaned_values, alpha=alpha, beta=beta)
                    residuals = np.array(cleaned_values) - np.array(fitted)
                    std_val = float(np.std(residuals))
                    
                    preds = []
                    for h in range(1, days_ahead + 1):
                        preds.append(last_level + h * last_trend)
                    sigma = [std_val] * days_ahead
                    method = "holt"
                except Exception as holt_err:
                    # Fallback 3: Linear regression
                    preds, std_val = _linear_extrapolate(cleaned_values, days_ahead)
                    sigma = [std_val] * days_ahead
                    method = "linear"

    results: list[dict] = []
    for i, pred in enumerate(preds):
        future_date = last_date + datetime.timedelta(days=i + 1)
        s = sigma[i] if isinstance(sigma, list) else sigma
        results.append({
            "date": str(future_date),
            "predicted_temperature": round(pred, 2),
            "confidence_lower": round(pred - s, 2),
            "confidence_upper": round(pred + s, 2),
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
