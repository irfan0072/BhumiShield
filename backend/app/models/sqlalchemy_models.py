"""SQLAlchemy 2 declarative models for PostgreSQL + Alembic migrations.

When SQLAlchemy is installed (e.g. inside Docker with PostgreSQL), these declarative
classes define the ORM mapping and Alembic metadata.
"""
from __future__ import annotations

from typing import Optional

DEMO_TABLES_METADATA = [
    "users",
    "locations",
    "persons",
    "plots",
    "khatian_records",
    "ownerships",
    "deeds",
    "mutations",
    "mortgages_liens",
    "audit_log",
    "risk_reports",
    "demo_scenarios",
]

try:
    from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
    from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

    class Base(DeclarativeBase):
        pass

    class UserModel(Base):
        __tablename__ = "users"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
        full_name_bn: Mapped[str] = mapped_column(String(128))
        full_name_en: Mapped[str] = mapped_column(String(128))
        role: Mapped[str] = mapped_column(String(32), index=True)
        office_bn: Mapped[str] = mapped_column(String(128))
        office_en: Mapped[str] = mapped_column(String(128))
        password_hash: Mapped[str] = mapped_column(String(256))
        created_at: Mapped[str] = mapped_column(String(64))

    class LocationModel(Base):
        __tablename__ = "locations"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        division_bn: Mapped[str] = mapped_column(String(64))
        division_en: Mapped[str] = mapped_column(String(64))
        district_bn: Mapped[str] = mapped_column(String(64))
        district_en: Mapped[str] = mapped_column(String(64))
        upazila_bn: Mapped[str] = mapped_column(String(64))
        upazila_en: Mapped[str] = mapped_column(String(64))
        mouza_bn: Mapped[str] = mapped_column(String(128))
        mouza_en: Mapped[str] = mapped_column(String(128))
        jl_no: Mapped[str] = mapped_column(String(32))

    class PersonModel(Base):
        __tablename__ = "persons"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        name_bn: Mapped[str] = mapped_column(String(128))
        name_en: Mapped[str] = mapped_column(String(128))
        father_name_bn: Mapped[str] = mapped_column(String(128))
        father_name_en: Mapped[str] = mapped_column(String(128))
        mother_name_bn: Mapped[str] = mapped_column(String(128))
        nid: Mapped[str] = mapped_column(String(32), unique=True, index=True)
        phone_dummy: Mapped[str] = mapped_column(String(32))
        is_deceased: Mapped[int] = mapped_column(Integer, default=0)
        heirs_recorded: Mapped[int] = mapped_column(Integer, default=1)
        address_bn: Mapped[str] = mapped_column(String(256))
        address_en: Mapped[str] = mapped_column(String(256))

    class PlotModel(Base):
        __tablename__ = "plots"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
        dag_no: Mapped[str] = mapped_column(String(32), index=True)
        dag_no_bn: Mapped[str] = mapped_column(String(32))
        land_type_bn: Mapped[str] = mapped_column(String(64))
        land_type_en: Mapped[str] = mapped_column(String(64))
        total_area_decimal: Mapped[float] = mapped_column(Float)
        notes_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        notes_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    class KhatianRecordModel(Base):
        __tablename__ = "khatian_records"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
        survey_type: Mapped[str] = mapped_column(String(16), index=True)  # CS, SA, RS, BS
        khatian_no: Mapped[str] = mapped_column(String(32))
        khatian_no_bn: Mapped[str] = mapped_column(String(32))
        recorded_area_decimal: Mapped[float] = mapped_column(Float)
        survey_year: Mapped[int] = mapped_column(Integer)
        parent_khatian_no: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
        status: Mapped[str] = mapped_column(String(32), default="VALID")
        remarks_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        remarks_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    class OwnershipModel(Base):
        __tablename__ = "ownerships"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        khatian_id: Mapped[int] = mapped_column(ForeignKey("khatian_records.id"), index=True)
        plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
        person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
        share_fraction: Mapped[str] = mapped_column(String(32))  # e.g., "1/2", "1/1", "1/4"
        share_float: Mapped[float] = mapped_column(Float)
        area_decimal: Mapped[float] = mapped_column(Float)
        is_latest: Mapped[int] = mapped_column(Integer, default=1)

    class DeedModel(Base):
        __tablename__ = "deeds"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        deed_no: Mapped[str] = mapped_column(String(64), unique=True, index=True)
        deed_type: Mapped[str] = mapped_column(String(32))  # SALE, HIBA, INHERITANCE, MORTGAGE
        seller_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
        buyer_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
        plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
        share_fraction: Mapped[str] = mapped_column(String(32))
        area_decimal: Mapped[float] = mapped_column(Float)
        price_bdt: Mapped[int] = mapped_column(Integer)
        status: Mapped[str] = mapped_column(String(32), index=True)  # REGISTERED, PENDING_MUTATION, MUTATED, HELD
        content_json: Mapped[str] = mapped_column(Text)
        original_content_json: Mapped[str] = mapped_column(Text)
        content_hash: Mapped[str] = mapped_column(String(128))
        prev_hash: Mapped[str] = mapped_column(String(128))
        signature: Mapped[str] = mapped_column(String(256))
        chain_index: Mapped[int] = mapped_column(Integer, unique=True, index=True)
        registered_by: Mapped[str] = mapped_column(String(64))
        created_at: Mapped[str] = mapped_column(String(64))

    class MutationModel(Base):
        __tablename__ = "mutations"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        case_no: Mapped[str] = mapped_column(String(64), unique=True, index=True)
        deed_id: Mapped[int] = mapped_column(ForeignKey("deeds.id"), index=True)
        plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
        seller_id: Mapped[int] = mapped_column(ForeignKey("persons.id"))
        buyer_id: Mapped[int] = mapped_column(ForeignKey("persons.id"))
        area_decimal: Mapped[float] = mapped_column(Float)
        status: Mapped[str] = mapped_column(String(32), index=True)  # PENDING, APPROVED, REJECTED
        decision_reason_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        decision_reason_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        decided_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
        decided_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
        created_at: Mapped[str] = mapped_column(String(64))

    class MortgageLienModel(Base):
        __tablename__ = "mortgages_liens"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
        borrower_id: Mapped[int] = mapped_column(ForeignKey("persons.id"))
        bank_name_bn: Mapped[str] = mapped_column(String(128))
        bank_name_en: Mapped[str] = mapped_column(String(128))
        branch_bn: Mapped[str] = mapped_column(String(128))
        amount_bdt: Mapped[int] = mapped_column(Integer)
        area_mortgaged_decimal: Mapped[float] = mapped_column(Float)
        status: Mapped[str] = mapped_column(String(32), index=True)  # ACTIVE, RELEASED
        created_at: Mapped[str] = mapped_column(String(64))
        released_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    class AuditLogModel(Base):
        __tablename__ = "audit_log"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        actor_username: Mapped[str] = mapped_column(String(64))
        actor_role: Mapped[str] = mapped_column(String(32))
        action: Mapped[str] = mapped_column(String(64))
        entity_type: Mapped[str] = mapped_column(String(64))
        entity_id: Mapped[str] = mapped_column(String(64))
        details_json: Mapped[str] = mapped_column(Text)
        entry_hash: Mapped[str] = mapped_column(String(128))
        prev_hash: Mapped[str] = mapped_column(String(128))
        chain_index: Mapped[int] = mapped_column(Integer, unique=True)
        created_at: Mapped[str] = mapped_column(String(64))

    class RiskReportModel(Base):
        __tablename__ = "risk_reports"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
        deed_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
        seller_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
        buyer_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
        requested_area_decimal: Mapped[float] = mapped_column(Float)
        verdict: Mapped[str] = mapped_column(String(32))  # SAFE, REVIEW, HIGH_RISK
        risk_score: Mapped[int] = mapped_column(Integer)
        flags_json: Mapped[str] = mapped_column(Text)
        created_at: Mapped[str] = mapped_column(String(64))

    class DemoScenarioModel(Base):
        __tablename__ = "demo_scenarios"
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        scenario_no: Mapped[int] = mapped_column(Integer, unique=True)
        code: Mapped[str] = mapped_column(String(64), unique=True)
        title_bn: Mapped[str] = mapped_column(String(256))
        title_en: Mapped[str] = mapped_column(String(256))
        expected_verdict: Mapped[str] = mapped_column(String(32))
        badge_bn: Mapped[str] = mapped_column(String(64))
        badge_en: Mapped[str] = mapped_column(String(64))
        description_bn: Mapped[str] = mapped_column(Text)
        description_en: Mapped[str] = mapped_column(Text)
        plot_id: Mapped[int] = mapped_column(Integer)
        deed_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
        seller_id: Mapped[int] = mapped_column(Integer)
        buyer_id: Mapped[int] = mapped_column(Integer)
        requested_area_decimal: Mapped[float] = mapped_column(Float)
        seller_nid_override: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
        recommended_view: Mapped[str] = mapped_column(String(64))

except ImportError:
    Base = None  # type: ignore
