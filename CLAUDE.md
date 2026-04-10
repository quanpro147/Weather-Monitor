# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Weather Monitor** — a Vietnamese weather monitoring web platform that collects, analyzes, and visualizes weather and air quality data across Vietnam. It integrates anomaly detection and LLM-generated summaries.

Data source: **Open-Meteo Archive API** (weather — free, no API key required). AQI data not yet integrated.

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
Open-Meteo Archive API  (free, no key)
        │
   data-pipeline/fetchers/  (psycopg2, scheduled via schedule lib)
        │
   data-pipeline/processors/ (clean + normalize)
        │
   Supabase (PostgreSQL)  ← primary store for time-series data
        │
   Redis cache            ← reduces DB load, reduces latency
        │
   services/api (FastAPI) ← ML inference + AI summary generation
        │
   Supabase REST API      ← direct frontend queries
        │
   apps/web (Next.js)     ← dashboard UI
```

### Key Design Decisions
- **Supabase** handles auth, Row Level Security, and auto-generated REST API — frontend queries it directly for most reads.
- **FastAPI** (`services/api`) is a separate microservice for ML inference and AI summary generation — not a general-purpose backend.
- **Redis** caches API responses to reduce DB load and latency. Open-Meteo is free/unlimited so rate limiting is not a concern.
- **LLM summaries** use prompt templates in `ml/prompts/` with Gemini or OpenAI (configured via env vars).

### Environment Variables
See `.env.example` for all required variables:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT` — direct PostgreSQL for data-pipeline
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — database (FastAPI + frontend)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` — cache
- `OPENAI_API_KEY`, `GEMINI_API_KEY` — LLM summarization
- `APP_ENV`, `APP_PORT` — service config

