"""Initial BhumiShield schema migration (PostgreSQL & SQLAlchemy 2).

Revision ID: 0001_initial
Revises: None
Create Date: 2026-10-16
"""
from typing import Sequence, Union

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Schema tables are created via SQLAlchemy metadata or DDL in database.py."""
    pass


def downgrade() -> None:
    pass
