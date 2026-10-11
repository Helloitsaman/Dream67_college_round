"""Trace persistence: audit-run models saved to MongoDB, plus the audit runner."""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from pymongo.collection import Collection

from .oracle import Finding, Oracle
from .target import Interaction, Target


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class TraceStep:
    index: int
    interaction: Interaction
    findings: list[Finding] = field(default_factory=list)

    @property
    def exploited(self) -> bool:
        return bool(self.findings)


@dataclass
class AuditRun:
    target_name: str
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    started_at: datetime = field(default_factory=_now)
    finished_at: datetime | None = None
    steps: list[TraceStep] = field(default_factory=list)

    @property
    def summary(self) -> dict[str, Any]:
        exploited = [s for s in self.steps if s.exploited]
        return {
            "total_prompts": len(self.steps),
            "exploited": len(exploited),
            "success_rate": len(exploited) / len(self.steps) if self.steps else 0.0,
            "errors": sum(1 for s in self.steps if s.interaction.error),
        }

    def to_document(self) -> dict[str, Any]:
        doc = asdict(self)
        doc["_id"] = self.run_id
        doc["summary"] = self.summary
        for step, raw in zip(self.steps, doc["steps"]):
            raw["exploited"] = step.exploited
        return doc


def save_run(run: AuditRun, collection: Collection) -> str:
    """Upsert the run into MongoDB (e.g. an `audit_runs` collection)."""
    doc = run.to_document()
    collection.replace_one({"_id": doc["_id"]}, doc, upsert=True)
    return run.run_id


def load_run(run_id: str, collection: Collection) -> dict[str, Any] | None:
    return collection.find_one({"_id": run_id})


def run_audit(
    target: Target,
    prompts: list[str],
    oracle: Oracle,
    collection: Collection | None = None,
    reset_between: bool = True,
) -> AuditRun:
    """Send each prompt to the target, check it with the oracle, optionally persist."""
    run = AuditRun(target_name=target.name)
    for i, prompt in enumerate(prompts):
        if reset_between:
            target.reset()
        interaction = target.send(prompt)
        run.steps.append(TraceStep(i, interaction, oracle.check(interaction)))
    run.finished_at = _now()
    if collection is not None:
        save_run(run, collection)
    return run
