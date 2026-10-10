from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class OracleOutcome(str, Enum):
    INJECTION_DETECTED = "INJECTION_DETECTED"
    POLICY_VIOLATION_ATTEMPTED = "POLICY_VIOLATION_ATTEMPTED"
    POLICY_VIOLATION_BLOCKED = "POLICY_VIOLATION_BLOCKED"
    POLICY_VIOLATION_EXECUTED = "POLICY_VIOLATION_EXECUTED"
    NO_VIOLATION_OBSERVED = "NO_VIOLATION_OBSERVED"
    INCONCLUSIVE = "INCONCLUSIVE"


class RunSummary(BaseModel):
    total_attempts: int = 0
    valid_attempts: int = 0
    verified_executed_violations: int = 0
    attempted_violations: int = 0
    blocked_attempts: int = 0
    inconclusive_attempts: int = 0
    attack_success_rate: float = 0


class AttackRunCreate(BaseModel):
    agent_id: str = Field(min_length=1, max_length=100)
    suite_id: str = Field(min_length=1, max_length=100)
    policy_set_id: str = Field(min_length=1, max_length=100)
    max_attempts_per_case: int = Field(default=1, ge=1, le=20)
    defense_id: str | None = Field(default=None, max_length=100)


class AttackRun(BaseModel):
    run_id: str
    agent_id: str
    suite_id: str
    policy_set_id: str
    defense_id: str | None = None
    status: RunStatus
    created_at: datetime = Field(default_factory=utc_now)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    policy_version: int = 1
    model_config_snapshot: dict[str, Any] = Field(default_factory=dict)
    summary: RunSummary = Field(default_factory=RunSummary)
    error: str | None = None


class PolicyRule(BaseModel):
    policy_id: str
    effect: Literal["allow", "deny"]
    action: str
    conditions: dict[str, Any] = Field(default_factory=dict)
    expected_enforcement: str = "deny"
    severity: Literal["low", "medium", "high", "critical"] = "high"
    title: str = "Policy violation"


class PolicySet(BaseModel):
    policy_set_id: str
    name: str
    version: int = 1
    default_effect: Literal["allow", "deny"] = "deny"
    rules: list[PolicyRule]
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ToolDefinition(BaseModel):
    tool_id: str
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any] = Field(default_factory=dict)
    sensitivity: str = "internal"
    required_permissions: list[str] = Field(default_factory=list)
    mock_side_effects: str = "none"
    created_at: datetime = Field(default_factory=utc_now)


class AgentDefinition(BaseModel):
    agent_id: str
    name: str
    description: str
    model: str = "deterministic/mock-v1"
    tool_ids: list[str]
    policy_set_id: str
    defense_profile_id: str | None = None
    config_version: int = 1
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TestCase(BaseModel):
    case_id: str
    name: str
    kind: Literal["attack", "benign", "regression"]
    attack_surface: Literal["email", "rag_document", "tool_response", "none"]
    user_task: str
    payload_id: str | None = None
    fixture_id: str
    policy_ids: list[str] = Field(default_factory=list)
    oracle_assertions: list[dict[str, Any]] = Field(default_factory=list)
    reset_fixture_id: str
    labels: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class TestSuite(BaseModel):
    suite_id: str
    name: str
    description: str
    case_ids: list[str]
    version: int = 1
    created_at: datetime = Field(default_factory=utc_now)


class Payload(BaseModel):
    payload_id: str
    category: str
    surface: str
    text: str = Field(max_length=12_000)
    goal: str
    source: str = "synthetic"
    parent_payload_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class TraceEvent(BaseModel):
    event_id: str
    run_id: str
    attempt_id: str
    sequence: int
    type: str
    source: str
    message: str
    tool_name: str | None = None
    arguments_redacted: dict[str, Any] | None = None
    result_redacted: dict[str, Any] | None = None
    policy_decision: str | None = None
    policy_ids: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=utc_now)


class OracleResult(BaseModel):
    outcome: OracleOutcome
    injection_detected: bool = False
    violated_policy_ids: list[str] = Field(default_factory=list)
    evidence_event_ids: list[str] = Field(default_factory=list)
    explanation: str


class Attempt(BaseModel):
    attempt_id: str
    run_id: str
    case_id: str
    payload_id: str | None = None
    attempt_index: int
    status: Literal["completed", "failed", "cancelled"] = "completed"
    oracle_result: OracleResult
    environment_snapshot_id: str
    created_at: datetime = Field(default_factory=utc_now)


class Finding(BaseModel):
    finding_id: str
    run_id: str
    case_id: str
    payload_id: str | None = None
    policy_id: str
    title: str
    violation_type: str
    outcome: OracleOutcome
    evidence_event_ids: list[str]
    replay_case_id: str
    severity: str
    trust_boundary: str
    actual_effect: str
    suggested_mitigation: str
    created_at: datetime = Field(default_factory=utc_now)


class Defense(BaseModel):
    defense_id: str
    name: str
    description: str
    config: dict[str, Any]
    applicability: list[str]
    version: int = 1
    created_at: datetime = Field(default_factory=utc_now)


class RegressionCreate(BaseModel):
    baseline_run_id: str
    defense_id: str


class RegressionResult(BaseModel):
    regression_id: str
    baseline_run_id: str
    defended_run_id: str
    status: RunStatus = RunStatus.COMPLETED
    case_results: list[dict[str, Any]] = Field(default_factory=list)
    attack_block_rate: float = 0
    benign_pass_rate: float = 0
    created_at: datetime = Field(default_factory=utc_now)


class Page(BaseModel):
    items: list[dict[str, Any]]
    total: int
    limit: int
    offset: int


class ToolRequest(BaseModel):
    name: str
    arguments: dict[str, Any]

    @field_validator("name")
    @classmethod
    def known_shape(cls, value: str) -> str:
        if not value or len(value) > 80:
            raise ValueError("Invalid tool name")
        return value


class ToolExecution(BaseModel):
    request: ToolRequest
    attempted: bool = True
    authorized: bool
    executed: bool
    policy_ids: list[str] = Field(default_factory=list)
    result: dict[str, Any] = Field(default_factory=dict)
    state_changed: bool = False

