from __future__ import annotations

import json
from typing import Any, Protocol
from urllib.parse import quote, urlsplit, urlunsplit

import httpx


PROTOCOL_VERSION = "1.0"
REQUIRED_CAPABILITIES = {"document_injection", "reset", "trusted_tool_events"}
REQUIRED_TOOLS = {"read_document", "send_email_mock"}
MAX_RESPONSE_BYTES = 1_000_000


class ExternalAgentError(RuntimeError):
    pass


class ExternalAgentAdapter(Protocol):
    async def health(self) -> dict[str, Any]: ...
    async def capabilities(self) -> dict[str, Any]: ...
    async def reset(self, run_id: str, attempt_id: str, control_mode: str) -> dict[str, Any]: ...
    async def inject_document(
        self, run_id: str, attempt_id: str, document_id: str, body: str
    ) -> dict[str, Any]: ...
    async def invoke(self, run_id: str, attempt_id: str, user_prompt: str) -> dict[str, Any]: ...
    async def get_evidence(self, run_id: str, attempt_id: str) -> dict[str, Any]: ...


def normalize_and_validate_endpoint(endpoint: str, allowed_endpoints: set[str]) -> str:
    parsed = urlsplit(endpoint.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Endpoint must be an absolute HTTP or HTTPS URL.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Endpoint credentials, query strings, and fragments are not allowed.")
    if parsed.path not in {"", "/"}:
        raise ValueError("Endpoint must not include an API path.")
    normalized = urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), "", "", "")).rstrip("/")
    normalized_allowed = {item.strip().rstrip("/").lower() for item in allowed_endpoints}
    if normalized.lower() not in normalized_allowed:
        raise ValueError("Endpoint is not present in ALLOWED_TEST_AGENT_ENDPOINTS.")
    return normalized


class HttpExternalAgentAdapter:
    def __init__(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        service_token: str,
        timeout_seconds: float = 20.0,
    ) -> None:
        self.client = client
        self.endpoint = endpoint.rstrip("/")
        self.headers = {"Authorization": f"Bearer {service_token}", "Accept": "application/json"}
        self.timeout_seconds = timeout_seconds

    async def _json(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
        authenticated: bool = True,
    ) -> dict[str, Any]:
        headers = self.headers if authenticated else {"Accept": "application/json"}
        try:
            async with self.client.stream(
                method,
                f"{self.endpoint}{path}",
                headers=headers,
                json=body,
                params=params,
                timeout=self.timeout_seconds,
            ) as response:
                if 300 <= response.status_code < 400:
                    raise ExternalAgentError("External agent returned a redirect, which is not permitted.")
                content = bytearray()
                async for chunk in response.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > MAX_RESPONSE_BYTES:
                        raise ExternalAgentError("External agent response exceeded the size limit.")
                if response.status_code >= 400:
                    raise ExternalAgentError(f"External agent returned HTTP {response.status_code}.")
        except httpx.TimeoutException as exc:
            raise ExternalAgentError("External agent request timed out.") from exc
        except httpx.RequestError as exc:
            raise ExternalAgentError("External agent could not be reached.") from exc
        try:
            parsed = json.loads(content)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ExternalAgentError("External agent returned invalid JSON.") from exc
        if not isinstance(parsed, dict):
            raise ExternalAgentError("External agent response must be a JSON object.")
        return parsed

    async def health(self) -> dict[str, Any]:
        return await self._json("GET", "/health", authenticated=False)

    async def capabilities(self) -> dict[str, Any]:
        return await self._json("GET", "/capabilities")

    async def validate(self) -> tuple[dict[str, Any], dict[str, Any]]:
        health = await self.health()
        capabilities = await self.capabilities()
        if health.get("protocol_version") != PROTOCOL_VERSION or capabilities.get("protocol_version") != PROTOCOL_VERSION:
            raise ExternalAgentError("External agent protocol version is not supported.")
        if not REQUIRED_CAPABILITIES.issubset(set(capabilities.get("capabilities", []))):
            raise ExternalAgentError("External agent is missing required test capabilities.")
        if not REQUIRED_TOOLS.issubset(set(capabilities.get("tool_names", []))):
            raise ExternalAgentError("External agent is missing required instrumented tools.")
        return health, capabilities

    async def reset(self, run_id: str, attempt_id: str, control_mode: str) -> dict[str, Any]:
        return await self._json(
            "POST",
            "/test/reset",
            body={
                "protocol_version": PROTOCOL_VERSION,
                "run_id": run_id,
                "attempt_id": attempt_id,
                "control_mode": control_mode,
            },
        )

    async def inject_document(
        self, run_id: str, attempt_id: str, document_id: str, body: str
    ) -> dict[str, Any]:
        return await self._json(
            "POST",
            f"/test/documents/{quote(document_id, safe='')}",
            body={
                "protocol_version": PROTOCOL_VERSION,
                "run_id": run_id,
                "attempt_id": attempt_id,
                "body": body,
            },
        )

    async def invoke(self, run_id: str, attempt_id: str, user_prompt: str) -> dict[str, Any]:
        return await self._json(
            "POST",
            "/test/invoke",
            body={
                "protocol_version": PROTOCOL_VERSION,
                "run_id": run_id,
                "attempt_id": attempt_id,
                "user_prompt": user_prompt,
            },
        )

    async def get_evidence(self, run_id: str, attempt_id: str) -> dict[str, Any]:
        return await self._json(
            "GET",
            f"/test/evidence/{quote(attempt_id, safe='')}",
            params={"run_id": run_id},
        )
