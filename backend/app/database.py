"""Database adapter supporting PostgreSQL (via SQLAlchemy/psycopg2 in Docker)
and local SQLite fallback for immediate zero-config testing on macOS/Linux.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Generator, Optional

from app.config import DATABASE_URL, SQLITE_DB_PATH

SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    full_name_bn TEXT NOT NULL,
    full_name_en TEXT NOT NULL,
    role TEXT NOT NULL,
    office_bn TEXT NOT NULL,
    office_en TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_bn TEXT NOT NULL,
    division_en TEXT NOT NULL,
    district_bn TEXT NOT NULL,
    district_en TEXT NOT NULL,
    upazila_bn TEXT NOT NULL,
    upazila_en TEXT NOT NULL,
    mouza_bn TEXT NOT NULL,
    mouza_en TEXT NOT NULL,
    jl_no TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    father_name_bn TEXT NOT NULL,
    father_name_en TEXT NOT NULL,
    mother_name_bn TEXT NOT NULL,
    nid TEXT UNIQUE NOT NULL,
    phone_dummy TEXT NOT NULL,
    is_deceased INTEGER NOT NULL DEFAULT 0,
    heirs_recorded INTEGER NOT NULL DEFAULT 1,
    address_bn TEXT NOT NULL,
    address_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    dag_no TEXT NOT NULL,
    dag_no_bn TEXT NOT NULL,
    land_type_bn TEXT NOT NULL,
    land_type_en TEXT NOT NULL,
    total_area_decimal REAL NOT NULL,
    notes_bn TEXT,
    notes_en TEXT
);

CREATE TABLE IF NOT EXISTS khatian_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    survey_type TEXT NOT NULL,
    khatian_no TEXT NOT NULL,
    khatian_no_bn TEXT NOT NULL,
    recorded_area_decimal REAL NOT NULL,
    survey_year INTEGER NOT NULL,
    parent_khatian_no TEXT,
    status TEXT NOT NULL DEFAULT 'VALID',
    remarks_bn TEXT,
    remarks_en TEXT
);

CREATE TABLE IF NOT EXISTS ownerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    khatian_id INTEGER NOT NULL REFERENCES khatian_records(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    person_id INTEGER NOT NULL REFERENCES persons(id),
    share_fraction TEXT NOT NULL,
    share_float REAL NOT NULL,
    area_decimal REAL NOT NULL,
    is_latest INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS deeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deed_no TEXT UNIQUE NOT NULL,
    deed_type TEXT NOT NULL,
    seller_id INTEGER NOT NULL REFERENCES persons(id),
    buyer_id INTEGER NOT NULL REFERENCES persons(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    share_fraction TEXT NOT NULL,
    area_decimal REAL NOT NULL,
    price_bdt INTEGER NOT NULL,
    status TEXT NOT NULL,
    content_json TEXT NOT NULL,
    original_content_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    chain_index INTEGER UNIQUE NOT NULL,
    registered_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mutations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT UNIQUE NOT NULL,
    deed_id INTEGER NOT NULL REFERENCES deeds(id),
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    seller_id INTEGER NOT NULL REFERENCES persons(id),
    buyer_id INTEGER NOT NULL REFERENCES persons(id),
    area_decimal REAL NOT NULL,
    status TEXT NOT NULL,
    decision_reason_bn TEXT,
    decision_reason_en TEXT,
    decided_by TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mortgages_liens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    borrower_id INTEGER NOT NULL REFERENCES persons(id),
    bank_name_bn TEXT NOT NULL,
    bank_name_en TEXT NOT NULL,
    branch_bn TEXT NOT NULL,
    amount_bdt INTEGER NOT NULL,
    area_mortgaged_decimal REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    released_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    chain_index INTEGER UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_id INTEGER NOT NULL REFERENCES plots(id),
    deed_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    requested_area_decimal REAL NOT NULL,
    verdict TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    flags_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_no INTEGER UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    expected_verdict TEXT NOT NULL,
    badge_bn TEXT NOT NULL,
    badge_en TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    plot_id INTEGER NOT NULL,
    deed_id INTEGER,
    seller_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    requested_area_decimal REAL NOT NULL,
    seller_nid_override TEXT,
    recommended_view TEXT NOT NULL
);
"""


class DBConnection:
    """Unified thin wrapper over PostgreSQL (psycopg2) or SQLite3 connection."""

    def __init__(self, raw_conn: Any, is_postgres: bool = False) -> None:
        self.raw_conn = raw_conn
        self.is_postgres = is_postgres

    def _adapt_sql(self, sql: str) -> str:
        if self.is_postgres:
            return sql.replace("?", "%s")
        return sql

    def execute(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> Any:
        cur = self.raw_conn.cursor()
        cur.execute(self._adapt_sql(sql), tuple(params))
        return cur

    def fetchall(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> list[dict[str, Any]]:
        cur = self.execute(sql, params)
        if not cur.description:
            return []
        cols = [col[0] for col in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def fetchone(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> Optional[dict[str, Any]]:
        cur = self.execute(sql, params)
        if not cur.description:
            return None
        cols = [col[0] for col in cur.description]
        row = cur.fetchone()
        return dict(zip(cols, row)) if row is not None else None

    def insert(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> int:
        if self.is_postgres:
            pg_sql = self._adapt_sql(sql.rstrip().rstrip(";")) + " RETURNING id"
            cur = self.raw_conn.cursor()
            cur.execute(pg_sql, tuple(params))
            row = cur.fetchone()
            return int(row[0]) if row else 0
        else:
            cur = self.execute(sql, params)
            return int(cur.lastrowid or 0)

    def commit(self) -> None:
        self.raw_conn.commit()

    def close(self) -> None:
        self.raw_conn.close()


def _get_sqlite_path() -> str:
    return os.getenv("BHUMISHIELD_TEST_DB") or SQLITE_DB_PATH


def get_connection() -> DBConnection:
    """Connects to PostgreSQL when psycopg2 + running server are available, otherwise SQLite."""
    use_pg = os.getenv("FORCE_POSTGRES", "0") == "1"
    if use_pg or (DATABASE_URL.startswith("postgresql") and not os.getenv("BHUMISHIELD_TEST_DB")):
        try:
            import psycopg2  # type: ignore

            conn = psycopg2.connect(DATABASE_URL, connect_timeout=2)
            return DBConnection(conn, is_postgres=True)
        except Exception:
            pass
    sqlite_path = _get_sqlite_path()
    conn = sqlite3.connect(sqlite_path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON;")
    return DBConnection(conn, is_postgres=False)


def init_db(reset: bool = False) -> None:
    """Creates all schema tables (and optionally drops existing tables first on reset)."""
    db = get_connection()
    try:
        if reset:
            tables = [
                "demo_scenarios",
                "risk_reports",
                "audit_log",
                "mortgages_liens",
                "mutations",
                "deeds",
                "ownerships",
                "khatian_records",
                "plots",
                "persons",
                "locations",
                "users",
            ]
            for tbl in tables:
                if db.is_postgres:
                    db.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")
                else:
                    db.execute(f"DROP TABLE IF EXISTS {tbl};")
        if db.is_postgres:
            pg_ddl = SCHEMA_DDL.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            for stmt in [s.strip() for s in pg_ddl.split(";") if s.strip()]:
                db.execute(stmt + ";")
        else:
            db.raw_conn.executescript(SCHEMA_DDL)
        db.commit()
    finally:
        db.close()


@contextmanager
def db_session() -> Generator[DBConnection, None, None]:
    db = get_connection()
    try:
        yield db
    finally:
        db.close()


def get_db() -> Generator[DBConnection, None, None]:
    with db_session() as db:
        yield db
