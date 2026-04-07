# Weather Monitor

Weather Monitor la he thong giam sat va phan tich thoi tiet thong minh cho lanh tho Viet Nam, trien khai duoi dang web dashboard tuong tac.

Du an tap trung vao 4 muc tieu:
- Thu thap va cap nhat du lieu thoi tiet, chat luong khong khi gan realtime
- Truc quan hoa du lieu bang ban do va bieu do
- Phat hien bat thuong (anomaly alerts)
- Tao tom tat tinh hinh thoi tiet bang AI

## 1) Nguon du lieu
- WAQI (World Air Quality Index): chi so AQI
- WeatherAPI: nhiet do, do am, gio, mua, UV va cac thong so khi tuong

## 2) Kien truc cong nghe
- Frontend: Next.js + React + Tailwind
- Backend API: FastAPI (Python)
- Database: Supabase (PostgreSQL)
- Cache: Redis
- Data Pipeline: Python (requests, pandas) + cron jobs
- AI/ML: scikit-learn + LLM API (OpenAI/Gemini)
- Infra: Docker Compose

## 3) Cau truc thu muc

- apps/web: giao dien dashboard
- services/api: backend API FastAPI
- services/worker: worker cho tac vu nen
- data-pipeline: fetch, clean va nap du lieu
- ml: notebooks, model va prompt
- infra: cau hinh docker, redis, supabase
- scripts: script setup nhanh local
- docs: tai lieu mo ta de tai

## 4) Huong dan khoi dong nhanh (local)

Buoc 1: Tao file moi truong
- Sao chep .env.example thanh .env
- Dien API key va thong tin ket noi can thiet

Buoc 2: Khoi dong Redis
- docker compose up -d redis

Buoc 3: Cai frontend
- cd apps/web
- npm install
- npm run dev

Buoc 4: Cai backend API
- pip install -r services/api/requirements.txt
- uvicorn services.api.main:app --reload --host 0.0.0.0 --port 8000

Buoc 5: Data pipeline (co ban)
- pip install -r data-pipeline/requirements.txt

## 5) Vai tro team (4 nguoi)

1. Data Engineer
- Viet fetcher WAQI/WeatherAPI
- Clean va chuan hoa du lieu
- Day du lieu vao Supabase theo lich

2. Backend Engineer
- Xay dung API va tich hop Redis cache
- Quan ly Supabase RLS/Edge Functions neu can
- Dockerize va deploy

3. AI/Data Analyst
- EDA du lieu thoi tiet
- Xay model anomaly detection
- Viet prompt cho AI weather summary

4. Frontend Developer
- Xay UI responsive
- Tich hop ban do va bieu do
- Hien thi canh bao va tom tat AI

## 6) Tinh trang hien tai
- Da co skeleton folder/file cho first commit
- Da co env mau, compose Redis, requirements va placeholder API
- San sang cho team phat trien song song theo module
