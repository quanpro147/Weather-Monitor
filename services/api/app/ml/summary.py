"""
LLM-powered weather summary using Google Gemini.

Supports multiple API keys for quota rotation:
  GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
When a key hits 429 (quota exceeded), the next key is tried automatically.
If all keys are exhausted, a rule-based summary is returned from the raw data.

The prompt is structured to answer the four most important analytical questions:
  1. Xu hướng chính (Main trend)
  2. Pattern đáng chú ý (Notable patterns)
  3. Dự đoán / giải thích (Prediction / explanation)
  4. Giá trị thực tế (Practical insight)
"""

import os
import statistics
from typing import List

import google.generativeai as genai

# ── Prompt template (Vietnamese, strict structure) ─────────────────────────────
WEATHER_PROMPT_TEMPLATE = """\
Bạn là một chuyên gia khí tượng học đang viết báo cáo phân tích dữ liệu thời tiết \
cho {city_name}, Việt Nam. Báo cáo dành cho hệ thống giám sát thời tiết chuyên nghiệp.

=== DỮ LIỆU THỐNG KÊ ({period_days} ngày gần nhất) ===
Nhiệt độ:
  - Trung bình: {temp_mean}°C  |  Cao nhất: {temp_max}°C  |  Thấp nhất: {temp_min}°C
  - Xu hướng: {trend_direction} ({slope_str})
Lượng mưa:
  - Tổng: {rain_total}mm trong kỳ
  - Ngày mưa (>1mm): {rainy_days}/{period_days} ngày
Độ ẩm: trung bình {humidity_mean}%
Gió: tối đa {wind_max} km/h

=== DỮ LIỆU 7 NGÀY GẦN NHẤT ===
{weather_data}

=== CÁC BẤT THƯỜNG PHÁT HIỆN ===
{anomaly_data}

Viết báo cáo insight BẰNG TIẾNG VIỆT, trả lời ĐÚNG 4 câu hỏi sau, mỗi câu một dòng, \
không dùng header, không dùng bullet, không dùng markdown:

1. XU HƯỚNG: Xu hướng chính của dữ liệu là gì? (nhiệt độ + lượng mưa, kèm số liệu cụ thể)
2. PATTERN: Có pattern hoặc điểm bất thường đáng chú ý nào? (nêu ngày và giá trị đo được)
3. DỰ ĐOÁN: Có thể dự đoán hoặc giải thích điều gì từ dữ liệu này? (lý do mùa vụ/địa lý)
4. THỰC TẾ: Insight có giá trị thực tế gì? (khuyến nghị cụ thể cho người dân hoặc đơn vị quản lý)

Yêu cầu: dùng số liệu thực, không dùng mở đầu chung chung như "Nhìn chung" hay "Tóm lại". \
Toàn bộ báo cáo PHẢI bằng tiếng Việt.
"""

# Confidence score thresholds
CONFIDENCE_HIGH_MIN_RECORDS = 20
CONFIDENCE_MEDIUM_MIN_RECORDS = 10


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
        direction = "ấm dần"
    elif slope < -0.05:
        direction = "mát dần"
    else:
        direction = "ổn định"

    slope_str = f"{slope:+.2f}°C/ngày" if abs(slope) >= 0.01 else "không thay đổi đáng kể"

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


def _compute_confidence(record_count: int, anomaly_count: int, provider: str) -> dict:
    """
    Compute a confidence metadata dict for the summary.

    Returns:
        level: "high" | "medium" | "low"
        score: 0–100
        reason: human-readable explanation
    """
    if provider == "Rule-based":
        return {"level": "low", "score": 35, "reason": "Không kết nối được AI — dùng công thức thống kê thay thế."}

    if record_count >= CONFIDENCE_HIGH_MIN_RECORDS:
        base = 85
        level = "high"
        reason = f"Đủ dữ liệu ({record_count} ngày) để phân tích xu hướng đáng tin cậy."
    elif record_count >= CONFIDENCE_MEDIUM_MIN_RECORDS:
        base = 65
        level = "medium"
        reason = f"Dữ liệu vừa đủ ({record_count} ngày) — kết quả tương đối tin cậy."
    else:
        base = 45
        level = "low"
        reason = f"Ít dữ liệu ({record_count} ngày) — phân tích có thể chưa đầy đủ."

    # Anomalies presence adds slight confidence that the signal is real
    if anomaly_count > 0:
        base = min(base + 5, 95)

    return {"level": level, "score": base, "reason": reason}


def _rule_based_summary(city_name: str, stats: dict, period_days: int, anomaly_count: int) -> str:
    """Generate a Vietnamese data-driven summary without an LLM when all API keys are exhausted."""
    direction_phrases = {
        "ấm dần": f"xu hướng ấm dần ({stats['slope_str']})",
        "mát dần": f"xu hướng mát dần ({stats['slope_str']})",
        "ổn định": "nhiệt độ ổn định",
    }
    trend_phrase = direction_phrases.get(stats["trend_direction"], "nhiệt độ ổn định")
    anomaly_note = (
        f"Phát hiện {anomaly_count} sự kiện bất thường về mặt thống kê trong kỳ này."
        if anomaly_count
        else "Không phát hiện bất thường đáng kể."
    )
    return (
        f"Trong {period_days} ngày qua, {city_name} ghi nhận {trend_phrase}, "
        f"nhiệt độ trung bình {stats['temp_mean']}°C "
        f"(cao nhất {stats['temp_max']}°C / thấp nhất {stats['temp_min']}°C). "
        f"Tổng lượng mưa đạt {stats['rain_total']} mm trong {stats['rainy_days']} ngày mưa, "
        f"độ ẩm trung bình {stats['humidity_mean']}%, gió mạnh nhất {stats['wind_max']} km/h. "
        f"{anomaly_note}"
    )


def generate_weather_summary(
    city_name: str,
    recent_records: List[dict],
    anomaly_records: List[dict],
) -> tuple[str, str, dict]:
    """
    Generate a structured Vietnamese weather insight, rotating through Gemini keys on quota errors.

    Returns
    -------
    (summary_text, provider_label, confidence)
      provider_label: "Gemini 2.5 Flash" on success or "Rule-based" when all keys fail.
      confidence: dict with keys level, score, reason
    """
    keys = _load_gemini_keys()
    if not keys:
        stats = _compute_stats(recent_records)
        text = _rule_based_summary(city_name, stats, len(recent_records), len(anomaly_records))
        confidence = _compute_confidence(len(recent_records), len(anomaly_records), "Rule-based")
        return text, "Rule-based", confidence

    stats = _compute_stats(recent_records)
    period_days = len(recent_records)

    last_7 = sorted(recent_records, key=lambda r: r["date"])[-7:]
    weather_str = "\n".join(
        f"  {r['date']}: tb {r.get('temperature_2m_mean', 'N/A')}°C "
        f"(max {r.get('temperature_2m_max', 'N/A')}°C / min {r.get('temperature_2m_min', 'N/A')}°C), "
        f"mưa {r.get('rain_sum', '0')}mm, "
        f"gió {r.get('wind_speed_10m_max', '0')}km/h, "
        f"độ ẩm {r.get('relative_humidity_2m_mean', 'N/A')}%"
        for r in last_7
    )

    anomaly_str = (
        "\n".join(
            f"  {r['date']}: điểm bất thường {r.get('anomaly_score', 0):.2f} — "
            f"được xác định là ngoại lệ thống kê"
            for r in anomaly_records
        )
        if anomaly_records
        else "  Không phát hiện bất thường đáng kể trong kỳ này."
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
            text = response.text.strip()
            confidence = _compute_confidence(period_days, len(anomaly_records), "Gemini 2.5 Flash")
            return text, "Gemini 2.5 Flash", confidence
        except Exception as exc:
            if _is_quota_error(exc):
                quota_errors.append(key_label)
                print(f"[summary] {key_label} quota exceeded, trying next key...")
                continue
            raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    print(f"[summary] All Gemini keys exhausted ({', '.join(quota_errors)}), using rule-based fallback.")
    text = _rule_based_summary(city_name, stats, period_days, len(anomaly_records))
    confidence = _compute_confidence(period_days, len(anomaly_records), "Rule-based")
    return text, "Rule-based", confidence