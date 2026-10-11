"""
Skeleton for an AI agent: system prompt, memory, tools, and a step loop.

Subclass `Agent` and implement `_call_model` to plug in an LLM provider.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Message:
    role: str  # "system" | "user" | "assistant" | "tool"
    content: str
    name: str | None = None  # tool name for role == "tool"


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any] = field(default_factory=dict)


@dataclass
class Tool:
    name: str
    description: str
    func: Callable[..., Any]


@dataclass
class AgentResponse:
    reply: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    trace: list[Message] = field(default_factory=list)


class Agent:
    def __init__(
        self,
        name: str,
        system_prompt: str,
        tools: list[Tool] | None = None,
        max_steps: int = 5,
    ):
        self.name = name
        self.system_prompt = system_prompt
        self.tools: dict[str, Tool] = {t.name: t for t in (tools or [])}
        self.max_steps = max_steps
        self.memory: list[Message] = []

    def register_tool(self, tool: Tool) -> None:
        self.tools[tool.name] = tool

    def reset(self) -> None:
        self.memory.clear()

    def run(self, user_input: str) -> AgentResponse:
        """Run the agent loop: call the model, execute requested tools, repeat."""
        self.memory.append(Message("user", user_input))
        executed: list[ToolCall] = []
        reply = ""

        for _ in range(self.max_steps):
            reply, requested = self._call_model(self._build_context())
            self.memory.append(Message("assistant", reply))
            if not requested:
                break
            for call in requested:
                executed.append(call)
                self.memory.append(
                    Message("tool", str(self._execute_tool(call)), name=call.name)
                )

        return AgentResponse(reply=reply, tool_calls=executed, trace=list(self.memory))

    def _build_context(self) -> list[Message]:
        return [Message("system", self.system_prompt), *self.memory]

    def _execute_tool(self, call: ToolCall) -> Any:
        tool = self.tools.get(call.name)
        if tool is None:
            return f"error: unknown tool '{call.name}'"
        try:
            return tool.func(**call.args)
        except Exception as exc:  # surface tool errors to the model
            return f"error: {exc}"

    def _call_model(self, context: list[Message]) -> tuple[str, list[ToolCall]]:
        """Return (reply_text, requested_tool_calls). Override with a real LLM call."""
        raise NotImplementedError("Implement _call_model with your LLM provider.")
