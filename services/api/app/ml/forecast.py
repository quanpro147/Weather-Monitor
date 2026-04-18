import numpy as np
import datetime

def forecast_temperature(records: list[dict], days_ahead: int = 7) -> list[dict]:
    """
    Sử dụng hàm hồi quy tuyến tính bậc 1 (polyfit) của Numpy để dự báo nhiệt độ.
    Yêu cầu: records phải có ít nhất 30 ngày để đảm bảo độ chính xác.
    """
    if len(records) < 30:
        return []

    # Sắp xếp lại mảng theo thời gian cho chắc chắn
    records = sorted(records, key=lambda x: x["date"])
    
    # Tạo mảng X (chỉ mục ngày: 0, 1, 2, ..., n)
    X = np.arange(len(records))
    
    # Tạo mảng Y (nhiệt độ trung bình)
    # Lấy 'temperature_2m_mean', nếu null thì dùng 0 hoặc fillna (ở đây mặc định get lấy 0)
    Y = np.array([float(r.get("temperature_2m_mean", 0) or 0) for r in records])

    # Fit đường thẳng y = ax + b (bậc 1)
    coefficients = np.polyfit(X, Y, 1)
    poly_func = np.poly1d(coefficients)

    last_date = datetime.date.fromisoformat(records[-1]["date"])
    forecast_results = []

    # Dự báo cho N ngày tiếp theo
    start_x = len(records)
    for i in range(days_ahead):
        future_x = start_x + i
        future_temp = poly_func(future_x)
        future_date = last_date + datetime.timedelta(days=i + 1)
        
        forecast_results.append({
            "date": future_date,
            "predicted_temperature": round(float(future_temp), 2)
        })

    return forecast_results