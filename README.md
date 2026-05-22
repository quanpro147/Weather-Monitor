# Weather Monitor (Giám Sát Thời Tiết)

**[Live Demo trên Vercel](https://weather-monitor-[URL].vercel.app)** <!-- TODO: cập nhật link Vercel thực -->

Weather Monitor là hệ thống giám sát và phân tích thời tiết thông minh cho lãnh thổ Việt Nam, triển khai dưới dạng Web Dashboard tương tác.

Dự án tập trung vào 4 mục tiêu chính:
- Thu thập và cập nhật dữ liệu thời tiết, chất lượng không khí gần thời gian thực (Near Real-time).
- Trực quan hóa dữ liệu bằng bản đồ và biểu đồ.
- Phát hiện bất thường (Anomaly alerts).
- Tạo tóm tắt tình hình thời tiết tự động bằng công nghệ AI.

## 1) Nguồn Dữ Liệu
- **Open-Meteo Archive API**: Nhiệt độ, độ ẩm, sức gió, bức xạ mặt trời, mây che phủ, lượng mưa...

## 2) Kiến Trúc Công Nghệ
- **Frontend**: Next.js + React + Tailwind CSS
- **Backend API**: FastAPI (Python)
- **Database**: PostgreSQL (Supabase Cloud / Remote)
- **Cache**: Redis
- **Data Pipeline**: Python (requests, pandas, psycopg2) + cơ chế tự động hoá với module schedule
- **AI/ML**: scikit-learn + LLM API (OpenAI/Gemini)
- **Infra**: Docker & Docker Compose

## 3) Cấu Trúc Thư Mục Chính
- `apps/web/`: Giao diện Dashboard (Web App)
- `services/api/`: Backend API bằng FastAPI
- `services/worker/`: Worker cho các tác vụ nền
- `data-pipeline/`: Crawl mã, làm sạch và nạp dữ liệu vào Database tự động. File `Collect_RealTime.py` chạy nền 24/7.
- `ml/`: Chứa Notebooks, mô hình Machine Learning và prompt AI.
- `infra/`: Cấu hình Docker, Redis, init SQL (`schema.sql`).
- `docs/`: Tài liệu mô tả

## 4) Hướng Dẫn Khởi Động Nhanh (local)

### Bước 1: Tạo file môi trường

```bash
cp .env.example .env
# Điền SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# và DB_* (kết nối psycopg2 đến Supabase cloud) vào .env
```

---

### Bước 2: Chạy hạ tầng bằng Docker

> **Yêu cầu:** Docker Desktop đang chạy.

**Chỉ khởi động Redis** (dùng khi dev backend local):

```bash
docker compose up -d redis
```

**Khởi động toàn bộ stack** (Redis + API + Data Pipeline):

```bash
docker compose up --build -d

# Xem log pipeline:
docker logs -f weather-data-pipeline

# Xem log API:
docker logs -f weather-monitor-api
```

> Lưu ý: Khi chạy trong Docker, đổi `REDIS_HOST=localhost` → `REDIS_HOST=redis` trong `.env`.

---

### Bước 3: Cài đặt môi trường Python bằng `uv`

> **Yêu cầu:** Python 3.12. Dùng `uv` thay vì `pip` — nhanh hơn 10–100x, tự quản lý venv.

**Cài `uv` (nếu chưa có):**

```bash
pip install uv
# hoặc: winget install astral-sh.uv  (Windows)
# hoặc: curl -LsSf https://astral.sh/uv/install.sh | sh  (macOS/Linux)
```

**Tạo venv Python 3.12 và cài dependencies:**

```bash
# Từ thư mục gốc repo
uv venv --python 3.12
uv pip install -r services/api/requirements.txt
```

**Kích hoạt venv:**

```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

---

### Bước 4: Chạy Backend API (dev local)

> Đảm bảo Redis đang chạy (`docker compose up -d redis`) và venv đã kích hoạt.

```bash
uv run uvicorn services.api.main:app --reload --host 0.0.0.0 --port 8000
```

API docs tại: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Bước 5: Chạy Frontend

**Frontend** (`apps/web` — port 3000):

```bash
cd apps/web
npm install
```

Tạo file `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
# Mở http://localhost:3000
```

---

### Bước 7: Data pipeline (Hệ thống tự động cào dữ liệu)

Pipeline (`data-pipeline/fetchers/Collect_RealTime.py`) tự động chạy mỗi ngày — nếu dữ liệu thời tiết bị trễ từ 2 ngày trở lên, nó sẽ tự động gọi Open-Meteo API lấy dữ liệu mới nhất. Chạy 24/7 qua Docker (`weather-data-pipeline` container).

Để kiểm tra dữ liệu hoặc thao tác DB thủ công: dùng Jupyter Notebook `se.ipynb` trong `data-pipeline/fetchers/`.
