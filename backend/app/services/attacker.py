from __future__ import annotations

from app.models import Payload, TestCase


class BoundedAttacker:
    """Produces auditable, deterministic payload variants for approved fixture surfaces only."""

    def candidate(self, case: TestCase, seed: Payload | None, attempt_index: int) -> dict[str, str | int | None]:
        text = seed.text if seed else "No attack payload; benign control."
        styles = ["direct", "authority-framed", "workflow-framed", "encoded-marker"]
        return {
            "parent_payload_id": seed.payload_id if seed else None,
            "surface": case.attack_surface,
            "attempt_index": attempt_index,
            "variation_style": styles[(attempt_index - 1) % len(styles)],
            "text": text,
        }

