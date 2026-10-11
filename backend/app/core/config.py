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
    test_agent_service_token: str = Field(
        default_factory=lambda: os.getenv("TEST_AGENT_SERVICE_TOKEN", "dev-phase2-agent-token")
    )
    allowed_test_agent_endpoints: str = Field(
        default_factory=lambda: os.getenv(
            "ALLOWED_TEST_AGENT_ENDPOINTS",
            "http://127.0.0.1:8090,http://localhost:8090,http://external-test-agent:8090",
        )
    )
    test_agent_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("TEST_AGENT_TIMEOUT_SECONDS", "20"))
    )
    attack_llm_provider: str = Field(
        default_factory=lambda: os.getenv("ATTACK_LLM_PROVIDER", "auto")
    )
    openai_api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = Field(
        default_factory=lambda: os.getenv("OPENAI_MODEL") or "gpt-6.1-sol"
    )
    openai_base_url: str = Field(
        default_factory=lambda: os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    )
    openai_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("OPENAI_TIMEOUT", "60"))
    )
    openrouter_api_key: str = Field(default_factory=lambda: os.getenv("OPENROUTER_API_KEY", ""))
    openrouter_model: str = Field(
        default_factory=lambda: os.getenv("OPENROUTER_MODEL") or "google/gemini-2.5-flash-lite"
    )
    openrouter_base_url: str = Field(
        default_factory=lambda: os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    )
    openrouter_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("OPENROUTER_TIMEOUT", "60"))
    )

    @property
    def allowed_test_agent_endpoint_set(self) -> set[str]:
        return {item.strip().rstrip("/") for item in self.allowed_test_agent_endpoints.split(",") if item.strip()}

    @property
    def resolved_attack_provider(self) -> str:
        if self.attack_llm_provider.lower() == "auto":
            if self.openai_api_key:
                return "openai"
            return "openrouter" if self.openrouter_api_key else "mock"
        return self.attack_llm_provider.lower()

    @property
    def production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()

