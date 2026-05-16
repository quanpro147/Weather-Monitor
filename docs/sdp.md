# Weather Monitor — Tài liệu Mô tả Hệ thống (SDP)

## 1. Tổng quan

**Weather Monitor** là nền tảng giám sát và phân tích thời tiết cho Việt Nam. Hệ thống thu thập dữ liệu lịch sử hàng ngày từ API mở, xử lý và chuẩn hóa, lưu vào cơ sở dữ liệu đám mây, rồi hiển thị trên dashboard web kèm phân tích thống kê và tóm tắt AI.

**Nguồn dữ liệu:** Open-Meteo Archive API (miễn phí, không cần API key).  
**Phạm vi:** ~1 500 thành phố/tỉnh thành trên toàn Việt Nam.  
**Chu kỳ cập nhật:** Mỗi ngày một lần qua GitHub Actions cron job.

---

## 2. Thu thập dữ liệu (Data Collection)

### 2.1 Nguồn và phương thức

| Mục | Chi tiết |
|-----|---------|
| API | `https://archive-api.open-meteo.com/v1/archive` |
| Phương thức | HTTP GET, không cần xác thực |
| Chu kỳ | Batch hàng ngày (GitHub Actions, chạy một lần rồi thoát) |
| Danh sách thành phố | `data-pipeline/fetchers/cities_1500.csv` |

### 2.2 Biến thu thập

17 biến khí tượng học mỗi ngày cho mỗi thành phố:

| Nhóm | Biến |
|------|------|
| Nhiệt độ (°C) | `temperature_2m_max`, `temperature_2m_min`, `temperature_2m_mean` |
| Mưa & bức xạ | `rain_sum` (mm), `shortwave_radiation_sum` (MJ/m²) |
| Gió | `wind_speed_10m_max/mean`, `wind_gusts_10m_max/mean`, `wind_direction_10m_dominant` |
| Độ ẩm (%) | `relative_humidity_2m_max/min/mean` |
| Mây che phủ (%) | `cloud_cover_max/min/mean` |
| Thời tiết | `weather_code` |

### 2.3 Cơ chế chống lỗi

- **Retry tự động:** Tối đa 5 lần với backoff `[1, 5, 15, 30, 60]` giây cho lỗi kết nối.
- **Rate-limit (HTTP 429):** Exponential backoff với full jitter, tối đa 300 giây mỗi bước, bỏ qua city sau 3 lần liên tiếp.
- **Incremental fetch:** Mỗi city chỉ tải từ ngày mới nhất đã có trong DB (`MAX(date)` qua Supabase RPC), tránh tải lại dữ liệu cũ.
- **Upsert theo batch 500 records:** `ON CONFLICT (city_id, date) DO UPDATE` — an toàn khi chạy lại.

---

## 3. Xử lý & Lưu trữ dữ liệu (Data Processing & Storage)

### 3.1 Pipeline làm sạch (4 bước tuần tự)

Pipeline chạy trên cửa sổ 30 ngày gần nhất sau mỗi lần fetch ([`data-pipeline/processors/cleaner.py`](../data-pipeline/processors/cleaner.py)):

```
[1] Loại bỏ duplicate
         ↓ keep='last' theo (city_id, date)
[2] Null hóa giá trị vật lý bất khả thi
         ↓ ví dụ: nhiệt độ < -20°C hoặc > 55°C → NaN
[3] Impute giá trị thiếu
         ↓ forward-fill → backward-fill → median toàn cột
         (xử lý per-city, không lẫn dữ liệu giữa các thành phố)
[4] Cap outlier thống kê (IQR Winsorizing)
         ↓ Q1 - 2.5×IQR ≤ x ≤ Q3 + 2.5×IQR
         (kết hợp với giới hạn vật lý, không xóa điểm — bảo toàn chuỗi thời gian)
```

Mỗi bước trả về báo cáo số hàng bị ảnh hưởng; kết quả ghi lại vào DB qua `UPDATE` từng hàng theo `(city_id, date)`.

### 3.2 Lưu trữ

| Thành phần | Công nghệ | Vai trò |
|-----------|-----------|---------|
| Primary store | Supabase (PostgreSQL cloud) | Lưu toàn bộ chuỗi thời gian |
| Cache | Redis | Giảm tải DB, giảm latency API |
| Retention | `pg_cron` chạy 03:00 hàng ngày | Xóa dữ liệu cũ hơn 900 ngày |

**Schema chính:**

```sql
-- cities: thông tin địa lý
cities (city_id PK, city, country, latitude, longitude)

-- weather_daily: dữ liệu khí tượng hàng ngày
weather_daily (id PK, city_id FK, date, ...17 biến..., UNIQUE(city_id, date))
```

CHECK constraints ở cấp DB đảm bảo không có giá trị ngoài giới hạn vật lý tồn tại trong kho dữ liệu, bổ sung cho bước làm sạch ở tầng pipeline.

---

## 4. Phân tích dữ liệu — EDA (Data Analysis)

### 4.1 Phân tích xu hướng (Trend)

Module [`services/api/app/ml/forecast.py`](../services/api/app/ml/forecast.py) tính xu hướng nhiệt độ:

- **Linear slope:** hồi quy tuyến tính trên chuỗi thời gian → phân loại `warming` (slope > +0.05°C/day), `cooling` (slope < -0.05°C/day), hoặc `stable`.
- **Dự báo 7 ngày:** Holt's Double Exponential Smoothing (α=0.4, β=0.2) — ưu tiên hơn regression tuyến tính vì thích nghi với momentum cục bộ của chuỗi thời gian ngắn. Fallback sang linear regression khi variance < 0.01°C².
- **Confidence band ±1σ** từ residuals in-sample đi kèm mỗi điểm dự báo.

### 4.2 Phân bố dữ liệu (Distribution)

API `/analytics/histogram` tính histogram nhiệt độ theo bin width cấu hình được (0.5–10°C), trả về phân phối tần suất các city theo dải nhiệt độ. Dữ liệu kết hợp weather DB + real-time AQI từ Open-Meteo.

### 4.3 Phát hiện bất thường (Anomaly Detection)

Module [`services/api/app/ml/anomaly.py`](../services/api/app/ml/anomaly.py) dùng **Isolation Forest** (unsupervised):

| Tham số | Giá trị | Lý do |
|---------|---------|-------|
| Features | 7 biến đa chiều (nhiệt độ, mưa, gió, độ ẩm, mây) | Phát hiện bất thường trên tổ hợp, không từng chiều |
| contamination | 0.05 | Giả định 5% dữ liệu lịch sử là bất thường |
| Chuẩn hóa | StandardScaler | Đưa các đơn vị khác nhau về cùng thang |
| Min records | 30 | Ngưỡng tối thiểu để model có ý nghĩa |

Mỗi record được gán `anomaly_score` (float, cao = bất thường hơn) và `is_anomaly` (boolean). `anomaly_score = -decision_function` để score cao đồng nghĩa với "lạ hơn".

### 4.4 So sánh đa thành phố (Cross-City Comparison)

Hai loại phân tích:

**Extremes** (`/analytics/extremes`): Xác định city nóng nhất, mưa nhiều nhất, AQI tệ nhất tại thời điểm hiện tại (kết hợp DB + real-time fetch).

**K-Means Clustering** (`/analytics/clustering`): Phân nhóm các city theo 3 chiều `(nhiệt độ, AQI, lượng mưa)` — k từ 2–8 nhóm, cấu hình qua query param. Mỗi cluster được đặt nhãn tự động dựa trên centroid (ví dụ: "Hot & High Pollution", "Warm & Dry"). Dữ liệu AQI được fetch song song với 16 goroutines và cache Redis 15 phút.

---

## 5. Dashboard & Trực quan hóa (Visualization)

**Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Leaflet.

### 5.1 Các trang chính

| Trang | URL | Nội dung |
|-------|-----|---------|
| Dashboard | `/` | KPI cards tổng quan (nhiệt độ, gió, độ ẩm, mây) |
| Phân tích EDA | `/analytics` | 4 biểu đồ EDA (xem bên dưới) |
| Insight Hub | `/insights` | AI summary + anomaly timeline + scatter chart |
| Bản đồ | `/map` | Interactive map (Leaflet) hiển thị dữ liệu theo địa lý |
| Danh sách trạm | `/stations` | Bảng tất cả thành phố kèm chỉ số mới nhất |

### 5.2 Biểu đồ EDA (`/analytics`)

| Component | Loại biểu đồ | Dữ liệu hiển thị |
|-----------|-------------|-----------------|
| `TrendChart` | Line chart | Chuỗi nhiệt độ theo thời gian + forecast 7 ngày |
| `CrossCityChart` | Bar chart | So sánh nhiệt độ / mưa / AQI giữa các city |
| `DistributionChart` | Histogram | Phân bố nhiệt độ theo bin (cấu hình được) |
| `ClusteringChart` | Scatter plot 2D | Phân cụm city theo (nhiệt độ, AQI) |

### 5.3 Bộ lọc

- Filter theo thành phố (dropdown)
- Filter theo khoảng thời gian (date range picker)
- Toggle scope: Vietnam only / Global
- Điều chỉnh số cluster k (2–8) cho K-Means
- Điều chỉnh bin width cho histogram

---

## 6. Insight & Diễn giải ⭐

Đây là thành phần trọng tâm nhất của hệ thống.

### 6.1 AI Summary (Tóm tắt thông minh)

Module [`services/api/app/ml/summary.py`](../services/api/app/ml/summary.py) gọi **Gemini 2.5 Flash** với prompt có cấu trúc, yêu cầu trả ra đúng 4 câu:

```
1. TREND      — Mô tả pattern chủ đạo (nhiệt độ + lượng mưa)
2. EVENTS     — Sự kiện đáng chú ý nhất với ngày cụ thể và con số đo được
3. INTERPRETATION — Lý giải tại sao pattern này đang xảy ra (bối cảnh mùa, yếu tố vùng)
4. OUTLOOK    — Khuyến nghị thực tế cho cư dân / nhà quy hoạch trong vài ngày tới
```

Prompt inject số liệu thống kê thực tế: nhiệt độ trung bình/max/min, tổng lượng mưa, số ngày mưa, độ ẩm trung bình, gió cực đại, hướng xu hướng, slope (°C/day), và danh sách anomaly flags.

**Cơ chế dự phòng:** Xoay vòng tối đa 10 Gemini API key (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, ...) khi gặp lỗi quota (HTTP 429). Khi tất cả key cạn kiệt, hệ thống tự động fallback sang **rule-based summary** — vẫn trả ra văn bản có ý nghĩa thay vì lỗi.

### 6.2 Trend Analysis (Phân tích xu hướng định lượng)

Hàm `compute_trend_summary` trả ra:

```json
{
  "direction": "warming | cooling | stable",
  "slope_per_day": 0.12,     // °C/ngày
  "period_days": 90,
  "mean_temp": 28.4,
  "temp_range": 12.1         // biên độ nhiệt max - min
}
```

Đây là input cho cả AI prompt và dashboard KPI cards.

### 6.3 Anomaly Alerts (Cảnh báo bất thường)

Component `AlertList` hiển thị các ngày được đánh dấu `is_anomaly = True` kèm `anomaly_score`. `AnomalyTimeline` vẽ trục thời gian highlight các điểm bất thường. `AnomalyScatterChart` vẽ scatter plot anomaly score theo thời gian để nhận diện cụm bất thường.

### 6.4 Cluster Insight (Phân tích cụm)

Mỗi cluster K-Means được gắn nhãn tự động từ centroid:

| Centroid | Nhãn tự động |
|---------|-------------|
| temp > 32°C, AQI > 150 | "Hot & High Pollution" |
| temp < 20°C, AQI < 50 | "Cold & Clean Air" |
| rain > 80mm | "Heavy Rain" |

Nhãn này giúp người dùng nhận diện ngay nhóm city có đặc điểm khí hậu tương đồng mà không cần đọc từng con số.

---

## 7. Kiến trúc kỹ thuật

### 7.1 Luồng dữ liệu tổng thể

```
Open-Meteo Archive API
        │  HTTP GET (batch hàng ngày)
        ▼
data-pipeline/fetchers/  ← GitHub Actions cron job
  Collect_RealTime.py
        │  upsert theo batch 500 records
        ▼
data-pipeline/processors/
  cleaner.py             ← 4-step cleaning pipeline (cửa sổ 30 ngày)
        │  UPDATE cleaned rows
        ▼
Supabase (PostgreSQL)    ← primary store, 900-day rolling retention
        │                        │
        │ supabase-py REST       │ psycopg2 (direct)
        ▼                        ▼
services/api (FastAPI)   ←→  Redis cache (TTL 15 phút)
  /weather, /anomaly            giảm tải DB
  /forecast, /summary
  /analytics/*
        │  REST API
        ▼
apps/web (Next.js 14)
  Dashboard, EDA, Insights, Map
```

### 7.2 Stack công nghệ

| Tầng | Công nghệ |
|------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts, Leaflet |
| Backend API | FastAPI (Python), Pydantic |
| ML | scikit-learn (Isolation Forest, K-Means, StandardScaler) |
| Forecasting | Holt's Double Exponential Smoothing (numpy) |
| LLM | Google Gemini 2.5 Flash (với rule-based fallback) |
| Database | Supabase / PostgreSQL (cloud) |
| Cache | Redis 7 (Docker) |
| Data pipeline | Pandas, psycopg2, supabase-py, requests |
| Scheduling | GitHub Actions cron (`.github/workflows/`) |
| Container | Docker Compose |

---

## 8. Đối chiếu với yêu cầu đồ án

| Yêu cầu | Trọng số | Triển khai trong hệ thống |
|---------|----------|--------------------------|
| Data pipeline & data quality | 20% | Incremental fetch → 4-step cleaner → CHECK constraints DB-level → quality report |
| EDA & analysis | 20% | Trend (slope, direction), distribution histogram, anomaly detection (Isolation Forest), K-Means clustering, cross-city comparison, extremes |
| Dashboard & visualization | 20% | 5 trang web: Dashboard, EDA, Insights, Map, Stations — line/bar/histogram/scatter/cluster charts, filters theo thành phố / thời gian / scope |
| Insight & interpretation ⭐ | 30% | AI Summary 4-câu (Gemini 2.5 Flash): trend + events + interpretation + outlook; trend direction định lượng (°C/day); anomaly alerts; cluster profiling tự động |
| Presentation & report | 10% | Tài liệu này + workflow.txt |
