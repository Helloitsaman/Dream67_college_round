from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.db.store import MongoDocumentStore
from app.scripts.generate_data import validate


async def main() -> None:
    validate()
    settings = get_settings()
    if not settings.mongodb_uri:
        print("JSONL datasets are valid. MongoDB verification skipped: MONGODB_URI is unset.")
        return
    store = MongoDocumentStore(settings)
    try:
        await store.ping()
        required = {"agents": 1, "tools": 7, "policy_sets": 1, "test_cases": 4, "test_suites": 1, "payloads": 3, "defenses": 1}
        actual = {name: await store.count(name) for name in required}
        missing = {name: count for name, count in required.items() if actual[name] < count}
        if missing:
            raise SystemExit(f"Seed verification failed: {missing}")
        print(f"Seed verification passed: {actual}")
    finally:
        await store.close()


if __name__ == "__main__":
    asyncio.run(main())

