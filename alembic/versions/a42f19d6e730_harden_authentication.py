"""harden authentication

Revision ID: a42f19d6e730
Revises: d91e6c4a2f80
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a42f19d6e730"
down_revision: Union[str, Sequence[str], None] = "d91e6c4a2f80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Normalize first, then enforce case-insensitive uniqueness. The existing
    # exact unique constraints remain useful as a second line of defence.
    op.execute("UPDATE users SET email = lower(trim(email)), username = trim(username)")
    op.create_index(
        "uq_users_email_normalized",
        "users",
        [sa.text("lower(email)")],
        unique=True,
    )
    op.create_index(
        "uq_users_username_normalized",
        "users",
        [sa.text("lower(username)")],
        unique=True,
    )

    # server_default=true preserves every account created before this feature.
    op.add_column(
        "users",
        sa.Column(
            "email_verified",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
    )
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("pending_email", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP")
    op.alter_column("users", "email_verified", server_default=sa.false())
    op.create_index(
        "uq_users_pending_email_normalized",
        "users",
        [sa.text("lower(pending_email)")],
        unique=True,
        postgresql_where=sa.text("pending_email IS NOT NULL"),
    )

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("csrf_token_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoke_reason", sa.String(length=50), nullable=True),
        sa.CheckConstraint("expires_at > created_at", name="ck_auth_sessions_expiry"),
        sa.CheckConstraint(
            "(revoked_at IS NULL AND revoke_reason IS NULL) OR "
            "(revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)",
            name="ck_auth_sessions_revocation",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_auth_sessions_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auth_sessions"),
        sa.UniqueConstraint("refresh_token_hash", name="uq_auth_sessions_refresh_token_hash"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index(
        "ix_auth_sessions_user_active",
        "auth_sessions",
        ["user_id", "revoked_at", "expires_at"],
    )

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(length=30), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "purpose IN ('verify_email', 'password_reset', 'email_change')",
            name="ck_auth_tokens_purpose",
        ),
        sa.CheckConstraint("expires_at > created_at", name="ck_auth_tokens_expiry"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_auth_tokens_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auth_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_auth_tokens_token_hash"),
    )
    op.create_index("ix_auth_tokens_user_id", "auth_tokens", ["user_id"])
    op.create_index("ix_auth_tokens_user_purpose", "auth_tokens", ["user_id", "purpose"])

    op.create_table(
        "auth_rate_limits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(length=30), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("blocked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("attempts >= 0", name="ck_auth_rate_limits_attempts"),
        sa.PrimaryKeyConstraint("id", name="pk_auth_rate_limits"),
        sa.UniqueConstraint("scope", "key_hash", name="uq_auth_rate_limits_scope_key"),
    )
    op.create_index("ix_auth_rate_limits_blocked_until", "auth_rate_limits", ["blocked_until"])

    op.create_table(
        "security_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("success", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_security_events_user_id_users", ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_security_events"),
    )
    op.create_index("ix_security_events_user_id", "security_events", ["user_id"])
    op.create_index("ix_security_events_event_type", "security_events", ["event_type"])
    op.create_index("ix_security_events_created_at", "security_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_security_events_created_at", table_name="security_events")
    op.drop_index("ix_security_events_event_type", table_name="security_events")
    op.drop_index("ix_security_events_user_id", table_name="security_events")
    op.drop_table("security_events")

    op.drop_index("ix_auth_rate_limits_blocked_until", table_name="auth_rate_limits")
    op.drop_table("auth_rate_limits")

    op.drop_index("ix_auth_tokens_user_purpose", table_name="auth_tokens")
    op.drop_index("ix_auth_tokens_user_id", table_name="auth_tokens")
    op.drop_table("auth_tokens")

    op.drop_index("ix_auth_sessions_user_active", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index("uq_users_pending_email_normalized", table_name="users")
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "pending_email")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "email_verified")
    op.drop_index("uq_users_username_normalized", table_name="users")
    op.drop_index("uq_users_email_normalized", table_name="users")
