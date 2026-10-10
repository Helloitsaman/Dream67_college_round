from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.db.store import MongoDocumentStore


async def main() -> None:
    settings = get_settings()
    if not settings.mongodb_uri:
        raise SystemExit("MONGODB_URI is required to initialize MongoDB.")
    store = MongoDocumentStore(settings)
    try:
        await store.ping()
        await store.initialize()
        print(f"Initialized MongoDB database '{settings.mongodb_db}'.")
    finally:
        await store.close()


if __name__ == "__main__":
    asyncio.run(main())

