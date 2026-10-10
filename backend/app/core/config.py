from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field


BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")


class Settings(BaseModel):
    app_name: str = "AgentBreak API"
    environment: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    mongodb_uri: str = Field(default_factory=lambda: os.getenv("MONGODB_URI", ""))
    mongodb_db: str = Field(
        default_factory=lambda: os.getenv("MONGODB_DB", os.getenv("DB_NAME", "AgentBreak"))
    )
    storage_backend: str = Field(default_factory=lambda: os.getenv("STORAGE_BACKEND", "auto"))
    backend_service_token: str = Field(
        default_factory=lambda: os.getenv("BACKEND_SERVICE_TOKEN", "dev-agentbreak-token")
    )
    simulator_network_mode: str = Field(
        default_factory=lambda: os.getenv("SIMULATOR_NETWORK_MODE", "offline")
    )
    max_attempts_per_case: int = Field(
        default_factory=lambda: int(os.getenv("MAX_ATTEMPTS_PER_CASE", "10"))
    )
    mongo_timeout_ms: int = Field(
        default_factory=lambda: int(os.getenv("MONGO_TIMEOUT_MS", "3000"))
    )
    report_dir: Path = Field(
        default_factory=lambda: Path(os.getenv("REPORT_DIR", ROOT_DIR / "artifacts" / "reports"))
    )

    @property
    def production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()

