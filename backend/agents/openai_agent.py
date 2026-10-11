"""Agent backed by the OpenAI Chat Completions API (with tool calling).

Reads OPENAI_API_KEY (required) and OPENAI_MODEL (optional) from the environment,
which `.env` provides via python-dotenv.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from .agent import Agent, Message, Tool, ToolCall

# Load backend/.env even when this module is used outside main.py
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

DEFAULT_MODEL = "gpt-4o-mini"


class OpenAIAgent(Agent):
    def __init__(
        self,
        name: str,
        system_prompt: str,
        tools: list[Tool] | None = None,
        max_steps: int = 5,
        model: str | None = None,
        temperature: float = 0.7,
    ):
        super().__init__(name, system_prompt, tools, max_steps)
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set. Add it to backend/.env.")
        self.client = OpenAI(api_key=api_key)
        self.model = model or os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
        self.temperature = temperature

    def _call_model(self, context: list[Message]) -> tuple[str, list[ToolCall]]:
        kwargs: dict = {
            "model": self.model,
            "messages": [self._to_openai(m) for m in context],
            "temperature": self.temperature,
        }
        if self.tools:
            kwargs["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    },
                }
                for t in self.tools.values()
            ]

        msg = self.client.chat.completions.create(**kwargs).choices[0].message

        calls: list[ToolCall] = []
        for tc in msg.tool_calls or []:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append(ToolCall(name=tc.function.name, args=args, id=tc.id))
        return msg.content or "", calls

    @staticmethod
    def _to_openai(m: Message) -> dict:
        if m.role == "tool":
            return {"role": "tool", "tool_call_id": m.tool_call_id, "content": m.content}
        out: dict = {"role": m.role, "content": m.content}
        if m.role == "assistant" and m.tool_calls:
            out["tool_calls"] = [
                {
                    "id": c.id,
                    "type": "function",
                    "function": {"name": c.name, "arguments": json.dumps(c.args)},
                }
                for c in m.tool_calls
            ]
        return out
