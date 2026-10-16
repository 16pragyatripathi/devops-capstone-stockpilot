from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "StockPilot API"
    app_version: str = "1.0.0"
    database_url: str = "postgresql+psycopg://stockpilot:stockpilot@localhost:5432/stockpilot"
    cors_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
