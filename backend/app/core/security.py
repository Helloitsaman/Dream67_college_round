from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    settings = get_settings()
    expected = settings.backend_service_token
    if settings.production and expected == "dev-agentbreak-token":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Replace the development service token before running in production.",
        )
    if not expected:
        if settings.production:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Backend service authentication is not configured.",
            )
        return

    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid service token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
