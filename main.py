"""
FastAPI + MongoDB Atlas connection test.

Setup:
    pip install -r requirements.txt
    (fill in .env with the values Aaron sent you)
    python main.py

Then open:
    http://127.0.0.1:8000/health   -> confirms the DB connection
    http://127.0.0.1:8000/docs     -> try POST and GET from the browser
"""

import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, OperationFailure, PyMongoError

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "agent_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "items")
PORT = int(os.getenv("PORT", "8000"))

client: MongoClient | None = None


def connect() -> MongoClient:
    """Create the client and ping the cluster. Raises if it can't connect."""
    if not MONGODB_URI or "<" in MONGODB_URI or "PASTE" in MONGODB_URI:
        raise RuntimeError("MONGODB_URI is missing or still has placeholders. Check your .env file.")
    c = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
    c.admin.command("ping")
    return c


def explain(err: Exception) -> str:
    """Turn a connection error into a hint about what to fix."""
    text = str(err)
    if isinstance(err, OperationFailure) or "Authentication failed" in text:
        return "Wrong username or password (URL-encode special characters in the password)."
    if isinstance(err, ConfigurationError) or "DNS" in text:
        return "Cluster address in MONGODB_URI looks wrong, or DNS is blocked on this network."
    if "timed out" in text or "ServerSelectionTimeoutError" in type(err).__name__:
        return "Timed out. Your IP is probably not allowed: ask Aaron to add it under Network Access."
    return text


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = connect()
    yield
    client.close()


app = FastAPI(title="Agent DB API", lifespan=lifespan)


def collection():
    return client[DB_NAME][COLLECTION_NAME]


def clean(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@app.get("/")
def root():
    return {"status": "running", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    """Pings the cluster and reports what this user can see."""
    try:
        client.admin.command("ping")
        return {
            "connected": True,
            "database": DB_NAME,
            "collection": COLLECTION_NAME,
            "collections_in_db": client[DB_NAME].list_collection_names(),
            "document_count": collection().count_documents({}),
        }
    except PyMongoError as e:
        raise HTTPException(status_code=503, detail=explain(e))


@app.post("/items", status_code=201)
def create_item(item: dict[str, Any] = Body(..., examples=[{"agent": "test", "message": "hello"}])):
    """Save any JSON object."""
    item["created_at"] = datetime.now(timezone.utc)
    try:
        result = collection().insert_one(item)
    except PyMongoError as e:
        raise HTTPException(status_code=503, detail=explain(e))
    return {"inserted_id": str(result.inserted_id)}


@app.get("/items")
def list_items(limit: int = 20):
    """Return the most recent documents."""
    try:
        docs = collection().find().sort("_id", -1).limit(min(limit, 100))
        return [clean(d) for d in docs]
    except PyMongoError as e:
        raise HTTPException(status_code=503, detail=explain(e))


if __name__ == "__main__":
    print("Testing MongoDB connection...")
    try:
        test = connect()
        print(f"SUCCESS: connected. Database '{DB_NAME}', collection '{COLLECTION_NAME}'.")
        test.close()
    except Exception as e:
        print(f"FAILED: {explain(e)}")
        sys.exit(1)

    print(f"Starting API at http://127.0.0.1:{PORT}  (docs at /docs)")
    uvicorn.run(app, host="127.0.0.1", port=PORT)
