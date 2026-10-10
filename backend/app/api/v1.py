from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.core.security import require_service_token
from app.db.store import DocumentStore
from app.models import (
    AttackRun,
    AttackRunCreate,
    RegressionCreate,
    RegressionResult,
    RunStatus,
    utc_now,
)
from app.services.report import build_json_report, build_markdown_report


router = APIRouter(prefix="/v1", dependencies=[Depends(require_service_token)])


def store_from(request: Request) -> DocumentStore:
    return request.app.state.store


def runner_from(request: Request):
    return request.app.state.runner


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

