from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.core.security import require_service_token
from app.db.store import DocumentStore
from app.models import (
    AgentIntegration,
    AgentIntegrationCreate,
    AttackRun,
    AttackRunCreate,
    Campaign,
    CampaignCreate,
    RegressionCreate,
    RegressionResult,
    RunStatus,
    utc_now,
)
from app.services.external_agent import ExternalAgentError, HttpExternalAgentAdapter, normalize_and_validate_endpoint
from app.services.report import build_json_report, build_markdown_report


router = APIRouter(prefix="/v1", dependencies=[Depends(require_service_token)])


def store_from(request: Request) -> DocumentStore:
    return request.app.state.store


def runner_from(request: Request):
    return request.app.state.runner


def campaign_runner_from(request: Request):
    return request.app.state.campaign_runner


async def _page(
    store: DocumentStore,
    collection: str,
    query: dict[str, Any] | None = None,
    *,
    limit: int = 50,
    offset: int = 0,
    sort: list[tuple[str, int]] | None = None,
) -> dict[str, Any]:
    return {
        "items": await store.list(collection, query, limit=limit, offset=offset, sort=sort),
        "total": await store.count(collection, query),
        "limit": limit,
        "offset": offset,
    }


@router.get("/agents")
async def list_agents(request: Request) -> dict[str, Any]:
    return await _page(store_from(request), "agents")


@router.get("/agents/integrations")
async def list_agent_integrations(request: Request) -> dict[str, Any]:
    return await _page(
        store_from(request),
        "agent_integrations",
        limit=100,
        sort=[("created_at", -1)],
    )


@router.post("/agents/integrations", status_code=status.HTTP_201_CREATED)
async def register_agent_integration(body: AgentIntegrationCreate, request: Request) -> dict[str, Any]:
    settings = request.app.state.campaign_runner.settings
    try:
        endpoint = normalize_and_validate_endpoint(body.endpoint, settings.allowed_test_agent_endpoint_set)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    adapter = HttpExternalAgentAdapter(
        request.app.state.http_client,
        endpoint,
        settings.test_agent_service_token,
        settings.test_agent_timeout_seconds,
    )
    try:
        health, capabilities = await adapter.validate()
    except ExternalAgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    integration = AgentIntegration(
        integration_id=f"agent-ext-{uuid4().hex[:16]}",
        name=body.name,
        endpoint=endpoint,
        capabilities=[str(item) for item in capabilities.get("capabilities", [])],
        tool_names=[str(item) for item in capabilities.get("tool_names", [])],
        health_status=str(health.get("status", "unknown")),
    )
    await store_from(request).insert("agent_integrations", integration.model_dump(mode="json"))
    return integration.model_dump(mode="json")


@router.get("/agents/integrations/{integration_id}")
async def get_agent_integration(integration_id: str, request: Request) -> dict[str, Any]:
    integration = await store_from(request).get("agent_integrations", {"integration_id": integration_id})
    if not integration:
        raise HTTPException(status_code=404, detail="Agent integration not found.")
    return integration


@router.get("/suites")
async def list_suites(request: Request) -> dict[str, Any]:
    store = store_from(request)
    page = await _page(store, "test_suites")
    for suite in page["items"]:
        suite["cases"] = []
        for case_id in suite.get("case_ids", []):
            case = await store.get("test_cases", {"case_id": case_id})
            if case:
                suite["cases"].append(case)
    return page


@router.get("/policies")
async def list_policies(request: Request) -> dict[str, Any]:
    return await _page(store_from(request), "policy_sets")


@router.get("/defenses")
async def list_defenses(request: Request) -> dict[str, Any]:
    return await _page(store_from(request), "defenses")


@router.post("/runs", status_code=status.HTTP_202_ACCEPTED)
async def create_run(body: AttackRunCreate, request: Request) -> dict[str, str]:
    store = store_from(request)
    if not await store.get("agents", {"agent_id": body.agent_id}):
        raise HTTPException(status_code=404, detail="Unknown agent_id.")
    if not await store.get("test_suites", {"suite_id": body.suite_id}):
        raise HTTPException(status_code=404, detail="Unknown suite_id.")
    policy = await store.get("policy_sets", {"policy_set_id": body.policy_set_id})
    if not policy:
        raise HTTPException(status_code=404, detail="Unknown policy_set_id.")
    if body.defense_id and not await store.get("defenses", {"defense_id": body.defense_id}):
        raise HTTPException(status_code=404, detail="Unknown defense_id.")

    run = AttackRun(
        run_id=f"run-{uuid4().hex[:16]}",
        agent_id=body.agent_id,
        suite_id=body.suite_id,
        policy_set_id=body.policy_set_id,
        defense_id=body.defense_id,
        status=RunStatus.QUEUED,
        policy_version=int(policy.get("version", 1)),
        model_config_snapshot={
            "provider": "mock",
            "model": "deterministic/mock-v1",
            "temperature": 0,
            "attempt_budget": body.max_attempts_per_case,
            "network_mode": "offline",
        },
    )
    await store.insert("runs", run.model_dump(mode="json"))
    runner_from(request).launch(run.run_id, body.max_attempts_per_case)
    return {"run_id": run.run_id, "status": run.status.value}


@router.get("/runs")
async def list_runs(
    request: Request,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    return await _page(store_from(request), "runs", limit=limit, offset=offset, sort=[("created_at", -1)])


@router.get("/runs/{run_id}")
async def get_run(run_id: str, request: Request) -> dict[str, Any]:
    run = await store_from(request).get("runs", {"run_id": run_id})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run


@router.get("/runs/{run_id}/events")
async def get_events(
    run_id: str,
    request: Request,
    limit: int = Query(default=250, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    if not await store_from(request).get("runs", {"run_id": run_id}):
        raise HTTPException(status_code=404, detail="Run not found.")
    return await _page(
        store_from(request),
        "trace_events",
        {"run_id": run_id},
        limit=limit,
        offset=offset,
        sort=[("timestamp", 1), ("sequence", 1)],
    )


@router.get("/runs/{run_id}/findings")
async def get_findings(run_id: str, request: Request) -> dict[str, Any]:
    if not await store_from(request).get("runs", {"run_id": run_id}):
        raise HTTPException(status_code=404, detail="Run not found.")
    return await _page(store_from(request), "findings", {"run_id": run_id}, limit=250)


@router.post("/runs/{run_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_run(run_id: str, request: Request) -> dict[str, str]:
    run = await store_from(request).get("runs", {"run_id": run_id})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    if run["status"] in {RunStatus.COMPLETED.value, RunStatus.FAILED.value, RunStatus.CANCELLED.value}:
        raise HTTPException(status_code=409, detail="Run has already finished.")
    runner_from(request).cancel(run_id)
    return {"run_id": run_id, "status": "cancellation_requested"}


@router.post("/regressions", status_code=status.HTTP_202_ACCEPTED)
async def create_regression(body: RegressionCreate, request: Request) -> dict[str, Any]:
    store = store_from(request)
    baseline = await store.get("runs", {"run_id": body.baseline_run_id})
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline run not found.")
    if baseline["status"] != RunStatus.COMPLETED.value:
        raise HTTPException(status_code=409, detail="Baseline run must be completed.")
    if not await store.get("defenses", {"defense_id": body.defense_id}):
        raise HTTPException(status_code=404, detail="Defense not found.")

    defended = AttackRun(
        run_id=f"run-{uuid4().hex[:16]}",
        agent_id=baseline["agent_id"],
        suite_id=baseline["suite_id"],
        policy_set_id=baseline["policy_set_id"],
        defense_id=body.defense_id,
        status=RunStatus.QUEUED,
        policy_version=int(baseline.get("policy_version", 1)),
        model_config_snapshot={**baseline.get("model_config_snapshot", {}), "replay_of": body.baseline_run_id},
    )
    await store.insert("runs", defended.model_dump(mode="json"))
    regression_id = f"reg-{uuid4().hex[:16]}"
    regression = RegressionResult(
        regression_id=regression_id,
        baseline_run_id=body.baseline_run_id,
        defended_run_id=defended.run_id,
        status=RunStatus.RUNNING,
    )
    await store.insert("regression_results", regression.model_dump(mode="json"))
    runner_from(request).launch(defended.run_id, int(baseline.get("model_config_snapshot", {}).get("attempt_budget", 1)))
    request.app.state.regression_tasks[regression_id] = request.app.state.create_regression_task(regression_id)
    return {"regression_id": regression_id, "defended_run_id": defended.run_id, "status": "running"}


@router.get("/regressions/{regression_id}")
async def get_regression(regression_id: str, request: Request) -> dict[str, Any]:
    regression = await store_from(request).get("regression_results", {"regression_id": regression_id})
    if not regression:
        raise HTTPException(status_code=404, detail="Regression not found.")
    return regression


@router.get("/reports/{run_id}")
async def get_report(
    run_id: str,
    request: Request,
    format: str = Query(default="json", pattern="^(json|markdown)$"),
) -> Response:
    report = await build_json_report(store_from(request), run_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    if format == "markdown":
        return Response(
            content=build_markdown_report(report),
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="agentbreak-{run_id}.md"'},
        )
    import json

    return Response(
        content=json.dumps(report, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="agentbreak-{run_id}.json"'},
    )


@router.get("/campaigns")
async def list_campaigns(
    request: Request,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    return await _page(
        store_from(request),
        "campaigns",
        limit=limit,
        offset=offset,
        sort=[("created_at", -1)],
    )


@router.post("/campaigns", status_code=status.HTTP_202_ACCEPTED)
async def create_campaign(body: CampaignCreate, request: Request) -> dict[str, str]:
    store = store_from(request)
    integration = await store.get("agent_integrations", {"integration_id": body.integration_id})
    if not integration or not integration.get("enabled"):
        raise HTTPException(status_code=404, detail="Enabled agent integration not found.")
    if not await store.get("phase2_scenarios", {"scenario_id": body.scenario_id}):
        raise HTTPException(status_code=404, detail="Phase 2 scenario not found.")
    runner = campaign_runner_from(request)
    campaign = Campaign(
        campaign_id=f"campaign-{uuid4().hex[:16]}",
        integration_id=body.integration_id,
        scenario_id=body.scenario_id,
        max_attempts=body.max_attempts,
        control_mode=body.control_mode,
        status=RunStatus.QUEUED,
        attacker_provider=runner.attacker.provider,
        attacker_model=runner.attacker.model_name,
    )
    await store.insert("campaigns", campaign.model_dump(mode="json"))
    runner.launch(campaign.campaign_id)
    return {"campaign_id": campaign.campaign_id, "status": campaign.status.value}


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, request: Request) -> dict[str, Any]:
    campaign = await store_from(request).get("campaigns", {"campaign_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return campaign


@router.get("/campaigns/{campaign_id}/attempts")
async def get_campaign_attempts(campaign_id: str, request: Request) -> dict[str, Any]:
    store = store_from(request)
    if not await store.get("campaigns", {"campaign_id": campaign_id}):
        raise HTTPException(status_code=404, detail="Campaign not found.")
    attempts = await store.list(
        "attack_attempts",
        {"campaign_id": campaign_id},
        sort=[("attempt_number", 1)],
        limit=5,
    )
    verifications = await store.list("verification_results", {"campaign_id": campaign_id}, limit=5)
    by_attempt = {item["attempt_id"]: item for item in verifications}
    for attempt in attempts:
        attempt["verification"] = by_attempt.get(attempt["attempt_id"])
    return {"items": attempts, "total": len(attempts), "limit": 5, "offset": 0}


@router.get("/attempts/{attempt_id}/evidence")
async def get_attempt_evidence(attempt_id: str, request: Request) -> dict[str, Any]:
    store = store_from(request)
    attempt = await store.get("attack_attempts", {"attempt_id": attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Campaign attempt not found.")
    events = await store.list(
        "tool_events",
        {"attempt_id": attempt_id},
        sort=[("timestamp", 1)],
        limit=250,
    )
    verification = await store.get("verification_results", {"attempt_id": attempt_id})
    return {"attempt": attempt, "events": events, "verification": verification}


@router.post("/campaigns/{campaign_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_campaign(campaign_id: str, request: Request) -> dict[str, str]:
    campaign = await store_from(request).get("campaigns", {"campaign_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if campaign["status"] in {RunStatus.COMPLETED.value, RunStatus.FAILED.value, RunStatus.CANCELLED.value}:
        raise HTTPException(status_code=409, detail="Campaign has already finished.")
    campaign_runner_from(request).cancel(campaign_id)
    return {"campaign_id": campaign_id, "status": "cancellation_requested"}

