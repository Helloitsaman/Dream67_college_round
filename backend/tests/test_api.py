from __future__ import annotations

import time
import unittest

from fastapi.testclient import TestClient

from app.main import app


AUTH = {"Authorization": "Bearer dev-agentbreak-token"}


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.context = TestClient(app)
        self.client = self.context.__enter__()

    def tearDown(self) -> None:
        self.context.__exit__(None, None, None)

    def test_health_and_authenticated_catalog(self) -> None:
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["network_mode"], "offline")
        self.assertEqual(self.client.get("/v1/agents").status_code, 401)
        agents = self.client.get("/v1/agents", headers=AUTH)
        self.assertEqual(agents.status_code, 200)
        self.assertEqual(agents.json()["items"][0]["agent_id"], "workplace-agent-v1")

    def test_run_contract_validation_and_completion(self) -> None:
        invalid = self.client.post(
            "/v1/runs",
            headers=AUTH,
            json={
                "agent_id": "workplace-agent-v1",
                "suite_id": "core-agent-security-v1",
                "policy_set_id": "workplace-baseline",
                "max_attempts_per_case": 0,
            },
        )
        self.assertEqual(invalid.status_code, 422)
        missing = self.client.get("/v1/runs/run-does-not-exist", headers=AUTH)
        self.assertEqual(missing.status_code, 404)

        created = self.client.post(
            "/v1/runs",
            headers=AUTH,
            json={
                "agent_id": "workplace-agent-v1",
                "suite_id": "core-agent-security-v1",
                "policy_set_id": "workplace-baseline",
                "max_attempts_per_case": 1,
            },
        )
        self.assertEqual(created.status_code, 202)
        run_id = created.json()["run_id"]
        run = None
        for _ in range(50):
            response = self.client.get(f"/v1/runs/{run_id}", headers=AUTH)
            self.assertEqual(response.status_code, 200)
            run = response.json()
            if run["status"] in {"completed", "failed"}:
                break
            time.sleep(0.01)
        self.assertIsNotNone(run)
        self.assertEqual(run["status"], "completed")
        self.assertGreaterEqual(run["summary"]["verified_executed_violations"], 2)
        findings = self.client.get(f"/v1/runs/{run_id}/findings", headers=AUTH)
        self.assertEqual(findings.status_code, 200)
        self.assertGreaterEqual(findings.json()["total"], 2)
        report = self.client.get(f"/v1/reports/{run_id}?format=markdown", headers=AUTH)
        self.assertEqual(report.status_code, 200)
        self.assertIn("AgentBreak controlled", report.text)

    def test_phase2_api_rejects_unapproved_targets_and_excessive_budget(self) -> None:
        unapproved = self.client.post(
            "/v1/agents/integrations",
            headers=AUTH,
            json={"name": "Unapproved", "endpoint": "http://unapproved.example.test:8090"},
        )
        self.assertEqual(unapproved.status_code, 422)
        excessive = self.client.post(
            "/v1/campaigns",
            headers=AUTH,
            json={
                "integration_id": "agent-ext-missing",
                "scenario_id": "document_injection_01",
                "max_attempts": 6,
                "control_mode": "vulnerable",
            },
        )
        self.assertEqual(excessive.status_code, 422)


if __name__ == "__main__":
    unittest.main()

