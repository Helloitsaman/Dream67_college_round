"""Target connector: sends prompts to the agent under audit and records what happened."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

from .agent import Agent


@dataclass
class Interaction:
    """One prompt/response exchange with the target."""

    prompt: str
    reply: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)  # [{"name":..., "args":{...}}]
    latency_ms: float = 0.0
    error: str | None = None


class Target(Protocol):
    name: str

    def send(self, prompt: str) -> Interaction: ...

    def reset(self) -> None: ...


class HttpTarget:
    """Agent exposed over HTTP.

    POSTs {"message": <prompt>} and expects JSON like
    {"reply": "...", "tool_calls": [{"name": "...", "args": {...}}]}.
    Field names are configurable.
    """

    def __init__(
        self,
        url: str,
        name: str = "http-target",
        headers: dict[str, str] | None = None,
        request_field: str = "message",
        reply_field: str = "reply",
        tool_calls_field: str = "tool_calls",
        timeout: float = 30.0,
    ):
        self.url = url
        self.name = name
        self.headers = headers or {}
        self.request_field = request_field
        self.reply_field = reply_field
        self.tool_calls_field = tool_calls_field
        self.timeout = timeout

    def send(self, prompt: str) -> Interaction:
        start = time.perf_counter()
        try:
            resp = httpx.post(
                self.url,
                json={self.request_field: prompt},
                headers=self.headers,
                timeout=self.timeout,
            )
            resp.raise_for_status()
            data = resp.json()
            return Interaction(
                prompt=prompt,
                reply=str(data.get(self.reply_field, "")),
                tool_calls=list(data.get(self.tool_calls_field) or []),
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        except Exception as exc:
            return Interaction(
                prompt=prompt,
                latency_ms=(time.perf_counter() - start) * 1000,
                error=f"{type(exc).__name__}: {exc}",
            )

    def reset(self) -> None:
        pass


class AgentTarget:
    """Wraps an in-process `Agent` (e.g. the sandboxed agent under audit)."""

    def __init__(self, agent: Agent):
        self.agent = agent
        self.name = agent.name

    def send(self, prompt: str) -> Interaction:
        start = time.perf_counter()
        try:
            result = self.agent.run(prompt)
            return Interaction(
                prompt=prompt,
                reply=result.reply,
                tool_calls=[{"name": c.name, "args": c.args} for c in result.tool_calls],
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        except Exception as exc:
            return Interaction(
                prompt=prompt,
                latency_ms=(time.perf_counter() - start) * 1000,
                error=f"{type(exc).__name__}: {exc}",
            )

    def reset(self) -> None:
        self.agent.reset()
