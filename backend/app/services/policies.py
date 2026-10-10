from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.models import PolicyRule, PolicySet, ToolRequest


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    matched_policy_ids: list[str]
    explanation: str


def _recipient_domain(value: Any) -> str:
    if not isinstance(value, str) or "@" not in value:
        return ""
    return value.rsplit("@", 1)[1].lower().strip()


def _condition_matches(rule: PolicyRule, request: ToolRequest, context: dict[str, Any]) -> bool:
    conditions = rule.conditions
    args = request.arguments

    allowed_domains = conditions.get("recipient_domain_not_in")
    if allowed_domains is not None:
        domain = _recipient_domain(args.get("recipient"))
        if not domain or domain in {str(item).lower() for item in allowed_domains}:
            return False

    classifications = conditions.get("data_classification_in")
    if classifications is not None:
        actual = context.get("data_classification")
        if actual not in classifications:
            return False

    prefixes = conditions.get("path_prefix_in")
    if prefixes is not None:
        path = args.get("path")
        if not isinstance(path, str) or not any(path.startswith(prefix) for prefix in prefixes):
            return False

    trusted_sources = conditions.get("source_trust_not_in")
    if trusted_sources is not None and context.get("source_trust") in trusted_sources:
        return False

    return True


def authorize(
    policy_set: PolicySet,
    request: ToolRequest,
    context: dict[str, Any],
    enforce: bool,
) -> PolicyDecision:
    matches = [
        rule
        for rule in policy_set.rules
        if rule.action == request.name and _condition_matches(rule, request, context)
    ]
    deny_ids = [rule.policy_id for rule in matches if rule.effect == "deny"]
    if deny_ids:
        if enforce:
            return PolicyDecision(False, deny_ids, "Denied by independent tool authorization policy.")
        return PolicyDecision(True, deny_ids, "Policy matched, but baseline enforcement is disabled.")

    allowed_by_rule = any(rule.effect == "allow" for rule in matches)
    if allowed_by_rule or policy_set.default_effect == "allow":
        return PolicyDecision(True, [], "Allowed by policy.")

    if enforce:
        return PolicyDecision(False, ["P-DEFAULT-DENY"], "Denied by the default-deny policy.")
    return PolicyDecision(True, [], "Baseline enforcement is disabled.")

