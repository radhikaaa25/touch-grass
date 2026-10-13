"""
FastAPI backend for the Touch Grass Text-to-SQL application.
Exposes a POST /api/ask endpoint that converts natural language
questions into SQL queries and returns results from the outdoors database.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import OutdoorAgent
from database import init_db, seed_db


# ── Lifespan (startup / shutdown) ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and seed the database on startup."""
    init_db()
    seed_db()
    yield


# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Touch Grass India API",
    description="Natural-language search for outdoor trails, treks, parks, and run clubs across India powered by AI.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Agent ────────────────────────────────────────────────────────────
MODEL = os.getenv("LLM_MODEL", "gemini/gemini-3.5-flash-lite")
agent = OutdoorAgent(model=MODEL)


# ── Request / Response schemas ───────────────────────────────────────
class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    generated_sql: str
    results: list[dict]
    error: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────
@app.post("/api/ask", response_model=AskResponse)
async def ask_question(payload: AskRequest):
    """
    Accept a natural language question, convert it to SQL,
    execute it against the outdoors database, and return the results.
    """
    answer = agent.ask(payload.question)
    return AskResponse(
        generated_sql=answer.get("generated_sql", ""),
        results=answer.get("results", []),
        error=answer.get("error"),
    )


@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "message": "Touch Grass India API is running 🌿🇮🇳"}
