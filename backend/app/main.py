"""BhumiShield ("ভূমি সুরক্ষা") FastAPI Application Entrypoint."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import CORS_ORIGINS
from app.database import db_session, init_db
from app.routers.system_admin import router as system_admin_router
from app.routers.verify_ledger import router as verify_router
from app.routers.workflows import router as workflows_router
from app.seed.seed_data import seed_all


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initializes schema and seeds dummy records automatically if database is empty."""
    init_db(reset=False)
    with db_session() as db:
        row = db.fetchone("SELECT COUNT(*) AS cnt FROM plots")
        count = int(row["cnt"]) if row else 0
    if count == 0 and not os.getenv("BHUMISHIELD_SKIP_AUTOSEED"):
        seed_all(reset=True)
    yield


app = FastAPI(
    title="ভূমি সুরক্ষা (BhumiShield) — Trust & Verification Layer API",
    description=(
        "Independent pre-registration verification, tamper-evident Ed25519 hash-chained deed ledger, "
        "and plain-language citizen 'Check Before You Buy' API for LandTech Innovation Hackathon 2026. "
        "**DEMO / DUMMY DATA ONLY — Never calls live government systems.**"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Ensures consistent `{code, message_bn, message_en}` error structure across all endpoints."""
    if isinstance(exc.detail, dict) and "message_bn" in exc.detail:
        payload = exc.detail
    else:
        payload = {
            "code": f"HTTP_{exc.status_code}",
            "message_bn": "অনুরোধটি সম্পন্ন করা যায়নি। অনুগ্রহ করে তথ্য যাচাই করে আবার চেষ্টা করুন।",
            "message_en": str(exc.detail),
        }
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message_bn": "ফর্মের তথ্যে ত্রুটি রয়েছে। অনুগ্রহ করে সকল ঘর সঠিকভাবে পূরণ করে আবার চেষ্টা করুন।",
            "message_en": "Input validation failed. Please check all required fields.",
            "details": exc.errors(),
        },
    )


@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "BhumiShield API (Demo / ডেমো ডেটা)",
        "disclaimer_bn": "ভূমি সুরক্ষা শুধুমাত্র ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।",
        "disclaimer_en": "BhumiShield flags risk for a human officer to decide. It never declares legal truth.",
    }


# Mount under /api/v1 (standard convention) and /api (direct compatibility for P1 /api/verify/deed/{id})
app.include_router(verify_router, prefix="/api/v1")
app.include_router(verify_router, prefix="/api")
app.include_router(workflows_router, prefix="/api/v1")
app.include_router(system_admin_router, prefix="/api/v1")
