import datetime
import json
from fastapi import APIRouter, HTTPException

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.ml.anomaly import detect_anomalies
from services.api.app.ml.summary import generate_weather_summary
from services.api.app.models.summary import SummaryResponse
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/summary", tags=["summary"])

CACHE_TTL = 3600  # Cache 1 giờ để tiết kiệm API Request và tăng tốc độ phản hồi

@router.get("/{city_id}", response_model=ApiResponse[SummaryResponse])
def get_summary(city_id: int):
    cache_key = f"summary:{city_id}:{datetime.date.today().isoformat()}"
    cache = get_redis()

    # 1. Kiểm tra Cache trong Redis
    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=SummaryResponse(**json.loads(cached)))

    db = get_supabase()

    # 2. Lấy thông tin thành phố
    city_res = db.table("cities").select("city").eq("city_id", city_id).execute()
    if not city_res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành phố")
    city_name = city_res.data[0]["city"]

    # 3. Lấy dữ liệu thời tiết 30 ngày gần nhất (để model Anomaly có đủ data tính toán)
    today = datetime.date.today()
    start_30_days = today - datetime.timedelta(days=30)
    
    weather_res = (
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .gte("date", start_30_days.isoformat())
        .order("date")
        .execute()
    )
    
    if not weather_res.data:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu thời tiết cho thành phố này")

    # 4. Tìm các ngày bất thường và lọc ra 7 ngày gần nhất
    annotated_records = detect_anomalies(weather_res.data)
    
    start_7_days = today - datetime.timedelta(days=7)
    recent_7_days = [r for r in annotated_records if datetime.date.fromisoformat(r["date"]) >= start_7_days]
    recent_anomalies = [r for r in recent_7_days if r.get("is_anomaly")]

    # 5. Gọi AI sinh tóm tắt
    summary_text = generate_weather_summary(city_name, recent_7_days, recent_anomalies)

    # 6. Chuẩn bị response và lưu Cache
    response_data = SummaryResponse(
        city_name=city_name,
        summary_text=summary_text,
        provider="Gemini 2.5 Flash"
    )

    cache.setex(
        cache_key,
        CACHE_TTL,
        response_data.model_dump_json()
    )

    return ApiResponse(success=True, data=response_data)