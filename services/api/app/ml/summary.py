"""
LLM-powered weather summary using Google Gemini.

Supports multiple API keys for quota rotation:
  GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
When a key hits 429 (quota exceeded), the next key is tried automatically.
If all keys are exhausted, a rule-based summary is returned from the raw data.

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


def _load_gemini_keys() -> List[str]:
    """Collect all configured Gemini API keys in priority order (supports up to 10 keys)."""
    _placeholder = "your_api_key_here"
    candidates = [os.getenv("GEMINI_API_KEY", "")] + [
        os.getenv(f"GEMINI_API_KEY_{i}", "") for i in range(2, 11)
    ]
    return [k for k in candidates if k and k != _placeholder]


def _is_quota_error(exc: Exception) -> bool:
    msg = str(exc)
    return "429" in msg or "quota" in msg.lower() or "RESOURCE_EXHAUSTED" in msg


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


def _rule_based_summary(city_name: str, stats: dict, period_days: int, anomaly_count: int) -> str:
    """Generate a data-driven summary without an LLM when all API keys are exhausted."""
    direction_phrases = {
        "warming": f"a warming trend ({stats['slope_str']})",
        "cooling": f"a cooling trend ({stats['slope_str']})",
        "stable": "stable temperatures",
    }
    trend_phrase = direction_phrases.get(stats["trend_direction"], "stable temperatures")
    anomaly_note = (
        f"{anomaly_count} statistically unusual event(s) were detected during this period."
        if anomaly_count
        else "No significant anomalies were detected."
    )
    return (
        f"Over the past {period_days} days, {city_name} recorded {trend_phrase} "
        f"with a mean of {stats['temp_mean']}°C "
        f"(max {stats['temp_max']}°C / min {stats['temp_min']}°C). "
        f"Total rainfall was {stats['rain_total']} mm across {stats['rainy_days']} rainy days, "
        f"with average humidity at {stats['humidity_mean']}% and peak winds of {stats['wind_max']} km/h. "
        f"{anomaly_note}"
    )


def generate_weather_summary(
    city_name: str,
    recent_records: List[dict],
    anomaly_records: List[dict],
) -> tuple[str, str]:
    """
    Generate a structured 4-sentence weather insight, rotating through Gemini keys on quota errors.

    Returns
    -------
    (summary_text, provider_label)
      provider_label is "Gemini 2.5 Flash" on success or "Rule-based" when all keys fail.
    """
    keys = _load_gemini_keys()
    if not keys:
        stats = _compute_stats(recent_records)
        return (
            _rule_based_summary(city_name, stats, len(recent_records), len(anomaly_records)),
            "Rule-based",
        )

    stats = _compute_stats(recent_records)
    period_days = len(recent_records)

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

    quota_errors: List[str] = []
    for i, key in enumerate(keys, start=1):
        key_label = "GEMINI_API_KEY" if i == 1 else f"GEMINI_API_KEY_{i}"
        try:
            genai.configure(api_key=key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            return response.text.strip(), "Gemini 2.5 Flash"
        except Exception as exc:
            if _is_quota_error(exc):
                quota_errors.append(key_label)
                print(f"[summary] {key_label} quota exceeded, trying next key...")
                continue
            raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    print(f"[summary] All Gemini keys exhausted ({', '.join(quota_errors)}), using rule-based fallback.")
    return (
        _rule_based_summary(city_name, stats, period_days, len(anomaly_records)),
        "Rule-based",
    )
