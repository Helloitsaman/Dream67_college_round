"""
FastAPI + MongoDB Atlas backend for AgentBreak.

Run with:
    python main.py
Or from the repository root:
    python backend/main.py
"""

import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, OperationFailure, PyMongoError

# Load environment variables from backend/.env or root .env
current_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=current_dir / ".env")
load_dotenv(dotenv_path=current_dir.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "AgentBreak")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "items")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS_RAW = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]

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
        return "Timed out. Your IP is probably not allowed: check Atlas Network Access (whitelist IP)."
    return text


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = connect()
    yield
    client.close()


app = FastAPI(title="AgentBreak Backend API", version="1.0.0", lifespan=lifespan)

# Enable CORS so Next.js frontend can make API calls without being blocked
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def collection():
    return client[DB_NAME][COLLECTION_NAME]


def clean(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@app.get("/")
def root():
    return {
        "status": "running",
        "service": "AgentBreak API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    """Pings the cluster and reports database connection status."""
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
def create_item(
    item: dict[str, Any] = Body(..., examples=[{"agent": "test", "message": "hello"}])
):
    """Save any JSON document to MongoDB."""
    item["created_at"] = datetime.now(timezone.utc)
    try:
        result = collection().insert_one(item)
    except PyMongoError as e:
        raise HTTPException(status_code=503, detail=explain(e))
    return {"inserted_id": str(result.inserted_id)}


@app.get("/items")
def list_items(limit: int = 20):
    """Return the most recent documents from MongoDB."""
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

    print(f"Starting API at http://127.0.0.1:{PORT} (docs at http://127.0.0.1:{PORT}/docs)")
    uvicorn.run("main:app", host="127.0.0.1", port=PORT, reload=True)
