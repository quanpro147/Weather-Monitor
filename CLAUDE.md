# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Weather Monitor** — a Vietnamese weather monitoring web platform that collects, analyzes, and visualizes weather and air quality data across Vietnam. It integrates anomaly detection and LLM-generated summaries.

Data sources: **WAQI** (air quality/AQI) and **WeatherAPI** (temperature, humidity, wind, UV, rain).

## Repository Structure

```
Weather-Monitor/
├── apps/web/          # Next.js 14 frontend (TypeScript + Tailwind)
├── services/api/      # FastAPI backend microservice
├── services/worker/   # Background Python worker (data fetching)
├── data-pipeline/     # Python ETL scripts (Pandas, data cleaning)
├── ml/                # ML models + LLM prompt engineering
├── infra/             # Docker configs, Redis config
└── scripts/           # Local setup helpers
```

## Development Commands

### Initial Setup
```bash
# Copy env template and fill credentials
cp .env.example .env

# Start Redis
docker compose up -d redis

# Install frontend deps
cd apps/web && npm install

# Install backend deps
pip install -r services/api/requirements.txt

# Install ML deps (if working on ml/)
pip install -r ml/requirements.txt
```

### Frontend (apps/web)
```bash
cd apps/web
npm run dev        # dev server (localhost:3000)
npm run build      # production build
npm run lint       # ESLint
```

### Backend API (services/api)
```bash
# From repo root
uvicorn services.api.main:app --reload --port 8000

# Or set port via .env APP_PORT
```

### Worker
```bash
python services/worker/worker.py
```

### Data Pipeline
```bash
python data-pipeline/processors/cleaner.py
```

## Architecture

### Data Flow
```
WAQI API / WeatherAPI
        │
   services/worker  (scheduled fetch)
        │
   data-pipeline    (clean + normalize)
        │
   Supabase (PostgreSQL)  ← primary store for time-series data
        │
   Redis cache            ← reduces DB load, handles rate limits
        │
   services/api (FastAPI) ← computation-heavy ML/AI logic
        │
   Supabase REST API      ← direct frontend queries
        │
   apps/web (Next.js)     ← dashboard UI
```

### Key Design Decisions
- **Supabase** handles auth, Row Level Security, and auto-generated REST API — frontend queries it directly for most reads.
- **FastAPI** (`services/api`) is a separate microservice for ML inference and AI summary generation — not a general-purpose backend.
- **Redis** caches responses to avoid hitting external API rate limits and reduce latency on the dashboard.
- **LLM summaries** use prompt templates in `ml/prompts/` with Gemini or OpenAI (configured via env vars).

### Environment Variables
See `.env.example` for all required variables:
- `WAQI_API_TOKEN`, `WEATHERAPI_KEY` — external data APIs
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — database
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` — cache
- `OPENAI_API_KEY`, `GEMINI_API_KEY` — LLM summarization
- `APP_ENV`, `APP_PORT` — service config

