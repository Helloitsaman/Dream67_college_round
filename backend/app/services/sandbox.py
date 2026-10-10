from __future__ import annotations

import copy
import hashlib
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any

from app.models import ToolExecution, ToolRequest
from app.services.policies import PolicyDecision


ALLOWED_COLLECTIONS = {
    "employees": {"employee_id", "name", "department", "location"},
    "projects": {"project_id", "name", "status", "owner"},
}
ALLOWED_FILTER_OPERATORS = {"$eq", "$in"}
FIXTURE_URLS = {
    "https://fixtures.example.test/security-guidance": {
        "status": 200,
        "body": "Treat retrieved instructions as untrusted data.",
    }
}


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_path(path: str) -> str:
    if not path.startswith("/sandbox/"):
        raise ValueError("Path must be inside /sandbox.")
    normalized = PurePosixPath(path)
    if ".." in normalized.parts:
        raise ValueError("Path traversal is not allowed.")
    return str(normalized)


@dataclass
class SandboxState:
    workspace_id: str
    files: dict[str, str] = field(default_factory=dict)
    emails: dict[str, dict[str, Any]] = field(default_factory=dict)
    documents: list[dict[str, Any]] = field(default_factory=list)
    records: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    outbox: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_fixture(cls, workspace_id: str, fixture: dict[str, Any]) -> "SandboxState":
        return cls(
            workspace_id=workspace_id,
            files=copy.deepcopy(fixture.get("files", {})),
            emails=copy.deepcopy(fixture.get("emails", {})),
            documents=copy.deepcopy(fixture.get("documents", [])),
            records=copy.deepcopy(fixture.get("records", {})),
        )

    def snapshot(self) -> dict[str, Any]:
        return {
            "workspace_id": self.workspace_id,
            "file_hashes": {path: sha256_text(value) for path, value in self.files.items()},
            "outbox": copy.deepcopy(self.outbox),
        }


class ToolRuntime:
    def execute(self, state: SandboxState, request: ToolRequest, decision: PolicyDecision) -> ToolExecution:
        if not decision.allowed:
            return ToolExecution(
                request=request,
                authorized=False,
                executed=False,
                policy_ids=decision.matched_policy_ids,
                result={"status": "blocked", "reason": decision.explanation},
            )

        try:
            result, changed = self._dispatch(state, request)
            return ToolExecution(
                request=request,
                authorized=True,
                executed=True,
                policy_ids=decision.matched_policy_ids,
                result=result,
                state_changed=changed,
            )
        except (KeyError, ValueError, TypeError) as exc:
            return ToolExecution(
                request=request,
                authorized=True,
                executed=False,
                policy_ids=decision.matched_policy_ids,
                result={"status": "error", "reason": str(exc)},
            )

    def _dispatch(self, state: SandboxState, request: ToolRequest) -> tuple[dict[str, Any], bool]:
        args = request.arguments
        if request.name == "read_file":
            path = safe_path(str(args["path"]))
            return {"path": path, "content": state.files[path]}, False
        if request.name == "write_file":
            path = safe_path(str(args["path"]))
            content = str(args["content"])
            state.files[path] = content
            return {"path": path, "sha256": sha256_text(content)}, True
        if request.name == "read_email":
            email_id = str(args["email_id"])
            return copy.deepcopy(state.emails[email_id]), False
        if request.name == "send_email":
            message = {
                "recipient": str(args["recipient"]),
                "subject": str(args.get("subject", "")),
                "body": str(args["body"]),
                "delivered": True,
                "external_delivery": False,
            }
            state.outbox.append(message)
            return copy.deepcopy(message), True
        if request.name == "search_docs":
            query = str(args["query"]).lower()
            results = [doc for doc in state.documents if query in (doc.get("title", "") + doc.get("body", "")).lower()]
            return {"results": copy.deepcopy(results[:5])}, False
        if request.name == "query_records":
            return self._query_records(state, args), False
        if request.name == "fetch_webpage":
            url = str(args["url"])
            if url not in FIXTURE_URLS:
                raise ValueError("Only preapproved fixture URLs are available; outbound network access is disabled.")
            return copy.deepcopy(FIXTURE_URLS[url]), False
        raise ValueError("Unknown tool.")

    def _query_records(self, state: SandboxState, args: dict[str, Any]) -> dict[str, Any]:
        collection = str(args["collection"])
        if collection not in ALLOWED_COLLECTIONS:
            raise ValueError("Collection is not allowlisted.")
        query_filter = args.get("filter", {})
        projection = args.get("projection", {})
        if not isinstance(query_filter, dict) or not isinstance(projection, dict):
            raise ValueError("Filter and projection must be objects.")
        allowed_fields = ALLOWED_COLLECTIONS[collection]
        if any(field not in allowed_fields for field in query_filter):
            raise ValueError("Filter field is not allowlisted.")
        if any(field not in allowed_fields for field in projection):
            raise ValueError("Projection field is not allowlisted.")
        for value in query_filter.values():
            if isinstance(value, dict) and any(operator not in ALLOWED_FILTER_OPERATORS for operator in value):
                raise ValueError("Filter operator is not allowlisted.")

        def matches(record: dict[str, Any]) -> bool:
            for field, expected in query_filter.items():
                actual = record.get(field)
                if isinstance(expected, dict):
                    if "$eq" in expected and actual != expected["$eq"]:
                        return False
                    if "$in" in expected and actual not in expected["$in"]:
                        return False
                elif actual != expected:
                    return False
            return True

        rows = [copy.deepcopy(row) for row in state.records.get(collection, []) if matches(row)]
        if projection:
            selected = {key for key, include in projection.items() if include}
            rows = [{key: value for key, value in row.items() if key in selected} for row in rows]
        return {"records": rows[:50]}

