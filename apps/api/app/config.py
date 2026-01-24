from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Don't use env_file - rely on environment variables from Docker/OS
    # Docker Compose loads .env file and passes vars as environment variables
    model_config = SettingsConfigDict(env_prefix="APP_", case_sensitive=False)

    db_user: str = "postgres"
    db_password: str = "postgres"
    db_host: str = "db"
    db_port: int = 5432
    db_name: str = "recipes"
    redis_url: str = "redis://redis:6379/0"
    sentry_dsn: Optional[str] = None
    posthog_key: Optional[str] = None
    posthog_host: Optional[str] = None
    openai_api_key: Optional[str] = None
    scrapecreators_api_key: Optional[str] = None
    environment: str = "local"
    testing: bool = False

    @property
    def database_url(self) -> str:
        if self.testing:
            return "sqlite+pysqlite:///:memory:"
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


@lru_cache
def get_settings() -> Settings:
    return Settings()

