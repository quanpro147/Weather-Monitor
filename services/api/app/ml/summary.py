"""
LLM-powered weather summary using Google Gemini.

The prompt is structured to produce a proper meteorologist-style insight:
  1. Overall trend characterisation (warming / cooling / stable, wet / dry)
  2. Notable extremes or anomalies with concrete numbers
  3. Pattern interpretation (why this might be happening)
  4. Practical outlook / recommendation for the next few days
"""

import os
import statistics
from typing import List

import google.generativeai as genai

WEATHER_PROMPT_TEMPLATE = """
You are a senior meteorologist producing a data-driven insight report for {city_name}, Vietnam.

=== STATISTICAL CONTEXT (last {period_days} days) ===
Temperature:
  - Mean: {temp_mean}°C  |  Max: {temp_max}°C  |  Min: {temp_min}°C
  - Trend: {trend_direction} ({slope_str})
Rainfall:
  - Total: {rain_total}mm over the period
  - Rainy days (>1mm): {rainy_days} of {period_days}
Humidity: avg {humidity_mean}%
Wind: max {wind_max} km/h

=== DAILY RECORDS (most recent 7 days) ===
{weather_data}

=== ANOMALY FLAGS ===
{anomaly_data}

Write a structured insight report in English with exactly these four parts — no headers, no bullet points, no filler phrases:

1. TREND: One sentence characterising the dominant pattern (temperature direction + rainfall pattern).
2. EVENTS: One sentence calling out the most notable event or anomaly with the specific date and measured value.
3. INTERPRETATION: One sentence explaining WHY this pattern is likely occurring (seasonal context, regional factors).
4. OUTLOOK: One practical sentence advising what residents or planners should expect or prepare for in the coming days.

Be specific and data-driven. Quote actual numbers. Do not use phrases like "Overall", "It is worth noting", "In summary".
"""


def _compute_stats(records: List[dict]) -> dict:
    """Derive aggregate statistics from a list of weather records."""
    temps = [float(r.get("temperature_2m_mean") or 0) for r in records]
    temp_max_vals = [float(r.get("temperature_2m_max") or 0) for r in records]
    temp_min_vals = [float(r.get("temperature_2m_min") or 0) for r in records]
    rain_vals = [float(r.get("rain_sum") or 0) for r in records]
    humidity_vals = [float(r.get("relative_humidity_2m_mean") or 0) for r in records]
    wind_vals = [float(r.get("wind_speed_10m_max") or 0) for r in records]

    rainy_days = sum(1 for r in rain_vals if r > 1.0)

    # Simple linear slope to determine trend direction
    slope = 0.0
    if len(temps) >= 3:
        n = len(temps)
        x_mean = (n - 1) / 2
        numerator = sum((i - x_mean) * (t - statistics.mean(temps)) for i, t in enumerate(temps))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator else 0.0

    if slope > 0.05:
        direction = "warming"
    elif slope < -0.05:
        direction = "cooling"
    else:
        direction = "stable"

    slope_str = f"{slope:+.2f}°C/day" if abs(slope) >= 0.01 else "no significant change"

    return {
        "temp_mean": round(statistics.mean(temps), 1) if temps else "N/A",
        "temp_max": round(max(temp_max_vals), 1) if temp_max_vals else "N/A",
        "temp_min": round(min(temp_min_vals), 1) if temp_min_vals else "N/A",
        "rain_total": round(sum(rain_vals), 1),
        "rainy_days": rainy_days,
        "humidity_mean": round(statistics.mean(humidity_vals), 1) if humidity_vals else "N/A",
        "wind_max": round(max(wind_vals), 1) if wind_vals else "N/A",
        "trend_direction": direction,
        "slope_str": slope_str,
    }


def generate_weather_summary(
    city_name: str,
    recent_records: List[dict],
    anomaly_records: List[dict],
) -> str:
    """
    Call Gemini to generate a structured 4-sentence weather insight.

    Parameters
    ----------
    city_name      : human-readable city name
    recent_records : last 30 days of weather (used for stats); last 7 days sent verbatim
    anomaly_records: records flagged by Isolation Forest
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return (
            "AI summarization is not configured. "
            "Weather data is currently within normal monitoring range."
        )

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    stats = _compute_stats(recent_records)
    period_days = len(recent_records)

    # Last 7 days verbatim for the daily table
    last_7 = sorted(recent_records, key=lambda r: r["date"])[-7:]
    weather_str = "\n".join(
        f"  {r['date']}: avg {r.get('temperature_2m_mean', 'N/A')}°C "
        f"(max {r.get('temperature_2m_max', 'N/A')}°C / min {r.get('temperature_2m_min', 'N/A')}°C), "
        f"rain {r.get('rain_sum', '0')}mm, "
        f"wind {r.get('wind_speed_10m_max', '0')}km/h, "
        f"humidity {r.get('relative_humidity_2m_mean', 'N/A')}%"
        for r in last_7
    )

    anomaly_str = (
        "\n".join(
            f"  {r['date']}: anomaly score {r.get('anomaly_score', 0):.2f} — "
            f"flagged as statistically unusual"
            for r in anomaly_records
        )
        if anomaly_records
        else "  No significant anomalies detected in this period."
    )

    prompt = WEATHER_PROMPT_TEMPLATE.format(
        city_name=city_name,
        period_days=period_days,
        temp_mean=stats["temp_mean"],
        temp_max=stats["temp_max"],
        temp_min=stats["temp_min"],
        rain_total=stats["rain_total"],
        rainy_days=stats["rainy_days"],
        humidity_mean=stats["humidity_mean"],
        wind_max=stats["wind_max"],
        trend_direction=stats["trend_direction"],
        slope_str=stats["slope_str"],
        weather_data=weather_str,
        anomaly_data=anomaly_str,
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as exc:
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc
