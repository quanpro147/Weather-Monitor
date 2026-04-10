# Weather Monitor (Giám Sát Thời Tiết)

Weather Monitor là hệ thống giám sát và phân tích thời tiết thông minh cho lãnh thổ Việt Nam, triển khai dưới dạng Web Dashboard tương tác.

Dự án tập trung vào 4 mục tiêu chính:
- Thu thập và cập nhật dữ liệu thời tiết, chất lượng không khí gần thời gian thực (Near Real-time).
- Trực quan hóa dữ liệu bằng bản đồ và biểu đồ.
- Phát hiện bất thường (Anomaly alerts).
- Tạo tóm tắt tình hình thời tiết tự động bằng công nghệ AI.

## 1) Nguồn Dữ Liệu
- **Open-Meteo Archive API**: Nhiệt độ, độ ẩm, sức gió, bức xạ mặt trời, mây che phủ, lượng mưa...
- **WAQI (World Air Quality Index)**: Chỉ số chất lượng không khí (AQI).

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

Bước 1: Tạo file môi trường
- Sao chép `.env.example` thành `.env`
- Điền API key và thông tin kết nối cần thiết

Bước 2: Khởi động Hạ tầng và Data Pipeline ngầm
- Cài đặt Database (PostgreSQL) thông qua Cloud Supabase. (Không cần chạy DB Server ở máy tính)
- Chạy Pipeline thu thập dữ liệu bằng lệnh sau:
- `docker-compose up --build -d`
- Kiểm tra log cào dữ liệu của pipeline: `docker logs -f pipeline`

Bước 2.5 (Tùy chọn): Đưa dữ liệu cũ lên Supabase
- Nếu bạn là Admin và đang có sẵn 1 database cục bộ dung lượng lớn, muốn tải lên Supabase cho team dùng, hãy mở Terminal:
- `python scripts/migrate_to_supabase.py`
- Khi được hỏi, hãy nhập mật khẩu kết nối. Mọi dòng dữ liệu sẽ được đẩy lên Cloud.

Bước 3: Cài đặt Frontend
- `cd apps/web`
- `npm install`
- `npm run dev`

Bước 4: Cài đặt Backend API
- `pip install -r services/api/requirements.txt`
- `uvicorn services.api.main:app --reload --host 0.0.0.0 --port 8000`

Bước 5: Data pipeline (Hệ thống tự động cào dữ liệu)
- Pipeline ngầm tự động đánh giá mỗi ngày 1 lần. Nếu dữ liệu thời tiết bị trễ từ 2 ngày trở lên, nó sẽ tự động gọi API lấy dữ liệu mới nhất.
- Bạn có thể thao tác cục bộ kiểm tra, xóa bảng DB bằng Jupyter Notebook `se.ipynb` trong mục `data-pipeline/fetchers/`.

## 5) Vai Trò Team (4 người)

1. Data Engineer
- Xây dựng luồng crawler cho WAQI/Open-Meteo.
- Clean và chuẩn hóa dữ liệu.
- Đẩy dữ liệu vào Database tự động theo lịch (Cron/Schedule).

2. Backend Engineer
- Xây dựng API và tích hợp Redis cache.
- Quản lý Database.
- Dockerize và deploy lên server.

3. AI/Data Analyst
- Phân tích dữ liệu thời tiết (EDA).
- Xây dựng mô hình cảnh báo dị thường (Anomaly detection).
- Viết prompt cho AI tạo weather summary.

4. Frontend Developer
- Xây dựng UI responsive.
- Tích hợp bản đồ và vẽ biểu đồ.
- Hiển thị cảnh báo và tóm tắt AI.

## 6) Tình Trạng Hiện Tại
- Đã hoàn thiện toàn bộ Data Pipeline ngầm tự động thu thập và bổ sung dữ liệu Thời tiết Việt Nam bằng Docker.
- Config tối ưu loại bỏ lặp dữ liệu, giảm tải API Request bằng thư viện `requests` nguyên bản giúp Data được cào nhanh hơn rất nhiều.
- Database đã được dịch chuyển thành công sang nền tảng **Supabase Cloud**, giúp cả nhóm dễ dàng chia sẻ dữ liệu mà không cần phải chạy local. Đã tạo script giúp anh em đồng bộ tự động `scripts/migrate_to_supabase.py`.
- Sẵn sàng bứt tốc cho team để phát triển song song các phần API / Web.
