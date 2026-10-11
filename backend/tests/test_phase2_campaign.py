from __future__ import annotations

import os
import unittest

import httpx

from app.core.config import Settings
from app.db.store import InMemoryStore
from app.models import AgentIntegration, Campaign, Phase2Verdict, RunStatus
from app.services.campaign_runner import CampaignRunner
from app.services.external_agent import HttpExternalAgentAdapter
from app.services.phase2_attacker import FakeAdaptiveAttacker
from external_test_agent.app import app as external_app


class Phase2CampaignTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        os.environ["TARGET_LLM_PROVIDER"] = "mock"
        os.environ["TEST_AGENT_SERVICE_TOKEN"] = "dev-phase2-agent-token"
        self.lifespan = external_app.router.lifespan_context(external_app)
        await self.lifespan.__aenter__()
        transport = httpx.ASGITransport(app=external_app)
        self.client = httpx.AsyncClient(transport=transport, base_url="http://test-agent", follow_redirects=False)

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        await self.lifespan.__aexit__(None, None, None)

    async def test_feedback_adaptation_and_persistence(self) -> None:
        store = InMemoryStore()
        await store.seed()
        integration = AgentIntegration(
            integration_id="agent-ext-test",
            name="External test agent",
            endpoint="http://test-agent",
            capabilities=["document_injection", "reset", "trusted_tool_events"],
            tool_names=["read_document", "send_email_mock"],
            health_status="ready",
        )
        await store.insert("agent_integrations", integration.model_dump(mode="json"))
        campaign = Campaign(
            campaign_id="campaign-adaptation",
            integration_id=integration.integration_id,
            scenario_id="document_injection_01",
            max_attempts=5,
            control_mode="vulnerable",
            status=RunStatus.QUEUED,
            attacker_provider="mock",
            attacker_model="deterministic/adaptive-attacker-v1",
        )
        await store.insert("campaigns", campaign.model_dump(mode="json"))
        settings = Settings(
            storage_backend="memory",
            attack_llm_provider="mock",
            test_agent_service_token="dev-phase2-agent-token",
            allowed_test_agent_endpoints="http://test-agent",
        )
        runner = CampaignRunner(
            store,
            self.client,
            settings,
            attacker=FakeAdaptiveAttacker(),
            adapter_factory=lambda item: HttpExternalAgentAdapter(
                self.client, item["endpoint"], settings.test_agent_service_token
            ),
        )
        await runner.execute(campaign.campaign_id)

        saved = await store.get("campaigns", {"campaign_id": campaign.campaign_id})
        attempts = await store.list("attack_attempts", {"campaign_id": campaign.campaign_id}, sort=[("attempt_number", 1)])
        verifications = await store.list("verification_results", {"campaign_id": campaign.campaign_id})
        events = await store.list("tool_events", {"campaign_id": campaign.campaign_id})

        self.assertEqual(saved["status"], RunStatus.COMPLETED.value)
        self.assertEqual(len(attempts), 2)
        self.assertIsNone(attempts[0]["parent_attempt_id"])
        self.assertEqual(attempts[1]["parent_attempt_id"], attempts[0]["attempt_id"])
        self.assertEqual(attempts[1]["feedback_source_attempt_id"], attempts[0]["attempt_id"])
        self.assertTrue(attempts[1]["feedback_digest"])
        self.assertNotEqual(attempts[0]["payload_sha256"], attempts[1]["payload_sha256"])
        self.assertIn(Phase2Verdict.EXECUTED_VIOLATION.value, {item["verdict"] for item in verifications})
        self.assertGreater(len(events), 0)


if __name__ == "__main__":
    unittest.main()
