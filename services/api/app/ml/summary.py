import os
import google.generativeai as genai
from typing import List

WEATHER_PROMPT_TEMPLATE = """
Bạn là một chuyên gia khí tượng học tại Việt Nam. Hãy viết một đoạn văn ngắn gọn (khoảng 3-4 câu, không dùng gạch đầu dòng) để tóm tắt và đánh giá tình hình thời tiết của thành phố {city_name} trong 7 ngày qua.

Dữ liệu thời tiết 7 ngày qua:
{weather_data}

Các ngày có dấu hiệu bất thường (nếu có, cần đặc biệt lưu ý và cảnh báo):
{anomaly_data}

Yêu cầu: 
- Văn phong tự nhiên, chuyên nghiệp, dễ hiểu cho người dân đọc.
- Nếu có ngày bất thường (mưa quá lớn, nhiệt độ quá cao/thấp), phải nhắc đến để cảnh báo.
- Nếu thời tiết bình thường, hãy đưa ra nhận xét chung (ví dụ: thời tiết ôn hòa, thích hợp cho các hoạt động ngoài trời...).
"""

def generate_weather_summary(city_name: str, recent_records: List[dict], anomaly_records: List[dict]) -> str:
    """
    Gọi Gemini 1.5 Flash để sinh đoạn tóm tắt thời tiết.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return "Hệ thống chưa được cấu hình AI. Dữ liệu thời tiết hiện tại đang trong ngưỡng theo dõi."

    # Cấu hình Gemini
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    # Chuẩn bị dữ liệu dạng chuỗi cho Prompt
    weather_str = "\n".join([
        f"- Ngày {r['date']}: Nhiệt độ TB {r.get('temperature_2m_mean', 'N/A')}°C, "
        f"Mưa {r.get('rain_sum', '0')}mm, "
        f"Gió {r.get('wind_speed_10m_max', '0')}km/h" 
        for r in recent_records
    ])
    
    anomaly_str = "\n".join([
        f"- Ngày {r['date']}: (Điểm bất thường: {r.get('anomaly_score', 0)})" 
        for r in anomaly_records
    ]) if anomaly_records else "Không ghi nhận bất thường nào đáng kể."

    prompt = WEATHER_PROMPT_TEMPLATE.format(
        city_name=city_name,
        weather_data=weather_str,
        anomaly_data=anomaly_str
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Lỗi khi gọi Gemini AI: {e}")
        return "Hiện tại không thể tạo tóm tắt thời tiết tự động. Vui lòng xem biểu đồ chi tiết."