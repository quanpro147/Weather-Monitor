from dataclasses import dataclass, field
import os

from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


@dataclass(frozen=True)
class Settings:
    # App
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    app_port: int = field(default_factory=lambda: int(os.getenv("APP_PORT", "8000")))

    # Supabase
    supabase_url: str = field(default_factory=lambda: _require("SUPABASE_URL"))
    supabase_anon_key: str = field(default_factory=lambda: _require("SUPABASE_ANON_KEY"))
    supabase_service_role_key: str = field(default_factory=lambda: _require("SUPABASE_SERVICE_ROLE_KEY"))

    # Redis
    redis_host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    redis_port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    redis_db: int = field(default_factory=lambda: int(os.getenv("REDIS_DB", "0")))

    # LLM (optional)
    openai_api_key: str | None = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    gemini_api_key: str | None = field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))

    # Data source APIs (optional — worker handles fetching, API reads from DB)
    waqi_api_token: str | None = field(default_factory=lambda: os.getenv("WAQI_API_TOKEN"))
    weatherapi_key: str | None = field(default_factory=lambda: os.getenv("WEATHERAPI_KEY"))


settings = Settings()
