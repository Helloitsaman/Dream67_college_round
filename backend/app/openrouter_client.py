
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()


class OpenRouterClient:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.model = os.getenv(
            "OPENROUTER_MODEL",
            "google/gemini-2.5-flash-lite",
        )
        self.base_url = os.getenv(
            "OPENROUTER_BASE_URL",
            "https://openrouter.ai/api/v1",
        ).rstrip("/")
        self.timeout = float(
            os.getenv("OPENROUTER_TIMEOUT", "60")
        )

        if not self.api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENROUTER_API_KEY is not configured.",
            )

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 512,
            "stream": False,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
            payload["parallel_tool_calls"] = False

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Title": "AgentBreak Security Lab",
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "OpenRouter rejected the request "
                    f"(HTTP {exc.response.status_code}). "
                    "Check API key, model support, and credits."
                ),
            ) from exc

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail="Could not connect to OpenRouter.",
            ) from exc

        try:
            return data["choices"][0]["message"]
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(
                status_code=502,
                detail="Unexpected response from OpenRouter.",
            ) from exc
