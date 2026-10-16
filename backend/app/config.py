"""Application configuration loaded from environment variables with sensible demo defaults."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://bhumishield:bhumishield_demo_2026@localhost:5432/bhumishield",
)
SQLITE_DB_PATH: str = os.getenv(
    "SQLITE_FALLBACK_PATH",
    str(BASE_DIR / "bhumishield_demo.db"),
)

JWT_SECRET: str = os.getenv(
    "JWT_SECRET",
    "bhumishield-landtech-2026-demo-jwt-secret-key-do-not-use-in-prod",
)
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))

# Deterministic 32-byte Ed25519 seed for demo reproducibility (never used in production)
REGISTRAR_ED25519_SEED_HEX: str = os.getenv(
    "REGISTRAR_ED25519_SEED_HEX",
    "4268756d69536869656c644c616e64546563683230323644656d6f5365656421",
)

RAPID_RESALE_DAYS: int = int(os.getenv("RAPID_RESALE_DAYS", "30"))
PUBLIC_VERIFY_BASE_URL: str = os.getenv("PUBLIC_VERIFY_BASE_URL", "http://localhost:5173")
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000",
    ).split(",")
    if o.strip()
]
