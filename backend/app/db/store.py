from __future__ import annotations

import asyncio
import copy
from collections import defaultdict
from typing import Any

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.errors import CollectionInvalid

from app.core.config import Settings
from app.services.fixtures import seed_documents


PRIMARY_KEYS = {
    "agents": "agent_id",
    "tools": "tool_id",
    "policy_sets": "policy_set_id",
    "test_cases": "case_id",
    "test_suites": "suite_id",
    "payloads": "payload_id",
    "runs": "run_id",
    "attempts": "attempt_id",
    "trace_events": "event_id",
    "findings": "finding_id",
    "defenses": "defense_id",
    "regression_results": "regression_id",
    "reports": "report_id",
}


class DocumentStore:
    backend_name = "abstract"

    async def ping(self) -> bool:
        raise NotImplementedError

    async def seed(self) -> None:
        for collection, documents in seed_documents().items():
            for document in documents:
                key = PRIMARY_KEYS[collection]
                await self.upsert(collection, {key: document[key]}, document)

    async def list(
        self,
        collection: str,
        query: dict[str, Any] | None = None,
        *,
        sort: list[tuple[str, int]] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def count(self, collection: str, query: dict[str, Any] | None = None) -> int:
        raise NotImplementedError

    async def get(self, collection: str, query: dict[str, Any]) -> dict[str, Any] | None:
        items = await self.list(collection, query, limit=1)
        return items[0] if items else None

    async def insert(self, collection: str, document: dict[str, Any]) -> None:
        raise NotImplementedError

    async def upsert(self, collection: str, query: dict[str, Any], document: dict[str, Any]) -> None:
        raise NotImplementedError

    async def update(self, collection: str, query: dict[str, Any], updates: dict[str, Any]) -> bool:
        raise NotImplementedError

    async def close(self) -> None:
        return None


class InMemoryStore(DocumentStore):
    backend_name = "memory"

    def __init__(self) -> None:
        self._collections: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def ping(self) -> bool:
        return True

    @staticmethod
    def _matches(document: dict[str, Any], query: dict[str, Any]) -> bool:
        return all(document.get(key) == value for key, value in query.items())

    async def list(
        self,
        collection: str,
        query: dict[str, Any] | None = None,
        *,
        sort: list[tuple[str, int]] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        query = query or {}
        items = [copy.deepcopy(item) for item in self._collections[collection] if self._matches(item, query)]
        for field, direction in reversed(sort or []):
            items.sort(key=lambda item: str(item.get(field, "")), reverse=direction < 0)
        return items[offset : offset + limit]

    async def count(self, collection: str, query: dict[str, Any] | None = None) -> int:
        return len(await self.list(collection, query, limit=1_000_000))

    async def insert(self, collection: str, document: dict[str, Any]) -> None:
        async with self._lock:
            key = PRIMARY_KEYS.get(collection)
            if key and any(item.get(key) == document.get(key) for item in self._collections[collection]):
                raise ValueError(f"Duplicate {key}")
            self._collections[collection].append(copy.deepcopy(document))

    async def upsert(self, collection: str, query: dict[str, Any], document: dict[str, Any]) -> None:
        async with self._lock:
            for index, item in enumerate(self._collections[collection]):
                if self._matches(item, query):
                    self._collections[collection][index] = copy.deepcopy(document)
                    return
            self._collections[collection].append(copy.deepcopy(document))

    async def update(self, collection: str, query: dict[str, Any], updates: dict[str, Any]) -> bool:
        async with self._lock:
            for item in self._collections[collection]:
                if self._matches(item, query):
                    item.update(copy.deepcopy(updates))
                    return True
        return False


JSON_SCHEMAS: dict[str, dict[str, Any]] = {
    name: {
        "$jsonSchema": {
            "bsonType": "object",
            "required": [key, "created_at"],
            "properties": {key: {"bsonType": "string"}, "created_at": {"bsonType": ["date", "string"]}},
        }
    }
    for name, key in PRIMARY_KEYS.items()
}


INDEXES: dict[str, list[tuple[list[tuple[str, int]], dict[str, Any]]]] = {
    name: [([(key, ASCENDING)], {"unique": True, "name": f"uq_{key}"})]
    for name, key in PRIMARY_KEYS.items()
}
INDEXES.update(
    {
        "runs": [
            ([("run_id", ASCENDING)], {"unique": True, "name": "uq_run_id"}),
            ([("status", ASCENDING), ("created_at", DESCENDING)], {"name": "ix_run_status_created"}),
            ([("agent_id", ASCENDING), ("created_at", DESCENDING)], {"name": "ix_run_agent_created"}),
        ],
        "attempts": [
            ([("attempt_id", ASCENDING)], {"unique": True, "name": "uq_attempt_id"}),
            ([("run_id", ASCENDING), ("attempt_index", ASCENDING)], {"name": "ix_attempt_run_index"}),
        ],
        "trace_events": [
            ([("event_id", ASCENDING)], {"unique": True, "name": "uq_event_id"}),
            ([("attempt_id", ASCENDING), ("sequence", ASCENDING)], {"unique": True, "name": "uq_event_attempt_sequence"}),
            ([("run_id", ASCENDING), ("timestamp", ASCENDING)], {"name": "ix_event_run_timestamp"}),
        ],
        "test_cases": [
            ([("case_id", ASCENDING)], {"unique": True, "name": "uq_case_id"}),
            ([("kind", ASCENDING), ("attack_surface", ASCENDING)], {"name": "ix_case_kind_surface"}),
        ],
    }
)


class MongoDocumentStore(DocumentStore):
    backend_name = "mongodb"

    def __init__(self, settings: Settings) -> None:
        self.client = AsyncMongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=settings.mongo_timeout_ms,
            appname="AgentBreak",
        )
        self.database = self.client[settings.mongodb_db]

    async def ping(self) -> bool:
        result = await self.client.admin.command("ping")
        return result.get("ok") == 1

    async def initialize(self) -> None:
        existing = set(await self.database.list_collection_names())
        for name, validator in JSON_SCHEMAS.items():
            if name not in existing:
                try:
                    await self.database.create_collection(name, validator=validator)
                except CollectionInvalid:
                    pass
            else:
                await self.database.command({"collMod": name, "validator": validator, "validationLevel": "moderate"})
            for keys, options in INDEXES.get(name, []):
                await self.database[name].create_index(keys, **options)

    @staticmethod
    def _clean(document: dict[str, Any]) -> dict[str, Any]:
        result = copy.deepcopy(document)
        result.pop("_id", None)
        return result

    async def list(
        self,
        collection: str,
        query: dict[str, Any] | None = None,
        *,
        sort: list[tuple[str, int]] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        cursor = self.database[collection].find(query or {}).skip(offset).limit(limit)
        if sort:
            cursor = cursor.sort(sort)
        return [self._clean(item) async for item in cursor]

    async def count(self, collection: str, query: dict[str, Any] | None = None) -> int:
        return await self.database[collection].count_documents(query or {})

    async def insert(self, collection: str, document: dict[str, Any]) -> None:
        await self.database[collection].insert_one(copy.deepcopy(document))

    async def upsert(self, collection: str, query: dict[str, Any], document: dict[str, Any]) -> None:
        await self.database[collection].replace_one(query, copy.deepcopy(document), upsert=True)

    async def update(self, collection: str, query: dict[str, Any], updates: dict[str, Any]) -> bool:
        result = await self.database[collection].update_one(query, {"$set": copy.deepcopy(updates)})
        return result.matched_count > 0

    async def close(self) -> None:
        await self.client.close()


async def create_store(settings: Settings) -> tuple[DocumentStore, str | None]:
    if settings.storage_backend == "memory" or not settings.mongodb_uri:
        store = InMemoryStore()
        await store.seed()
        return store, None

    mongo = MongoDocumentStore(settings)
    try:
        await mongo.ping()
        await mongo.initialize()
        await mongo.seed()
        return mongo, None
    except Exception as exc:
        await mongo.close()
        if settings.storage_backend == "mongodb" or settings.production:
            raise
        store = InMemoryStore()
        await store.seed()
        return store, f"MongoDB unavailable; using volatile memory storage: {type(exc).__name__}"

