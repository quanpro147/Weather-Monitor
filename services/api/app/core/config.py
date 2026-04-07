from dataclasses import dataclass
import os


@dataclass
class Settings:
	app_env: str = os.getenv("APP_ENV", "development")
	app_port: int = int(os.getenv("APP_PORT", "8000"))


settings = Settings()
