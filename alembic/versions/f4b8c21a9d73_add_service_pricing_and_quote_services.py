"""add service pricing modes and services in quote items

Revision ID: f4b8c21a9d73
Revises: c3a1f5d9e821
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4b8c21a9d73"
down_revision: Union[str, Sequence[str], None] = "c3a1f5d9e821"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "services",
        "hourly_rate",
        new_column_name="price",
        existing_type=sa.Float(),
        existing_nullable=False,
    )
    op.add_column("services", sa.Column("pricing_type", sa.String(20), nullable=True))
    op.execute("UPDATE services SET pricing_type = 'hourly'")
    op.alter_column(
        "services",
        "pricing_type",
        existing_type=sa.String(20),
        nullable=False,
        server_default="fixed",
    )
    op.alter_column(
        "services",
        "duration",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.create_check_constraint(
        "ck_services_pricing_type",
        "services",
        "pricing_type IN ('fixed', 'hourly')",
    )
    op.create_check_constraint("ck_services_price_positive", "services", "price > 0")
    op.create_check_constraint(
        "ck_services_duration_positive",
        "services",
        "duration IS NULL OR duration > 0",
    )

    op.add_column("quote_items", sa.Column("service_id", sa.Integer(), nullable=True))
    op.add_column("quote_items", sa.Column("item_name", sa.String(100), nullable=True))
    op.add_column(
        "quote_items",
        sa.Column("unit", sa.String(20), nullable=False, server_default="unit"),
    )
    op.execute(
        """
        UPDATE quote_items AS qi
        SET item_name = products.name
        FROM products
        WHERE qi.product_id = products.id
        """
    )
    op.alter_column(
        "quote_items",
        "item_name",
        existing_type=sa.String(100),
        nullable=False,
    )
    op.alter_column(
        "quote_items",
        "unit",
        existing_type=sa.String(20),
        server_default=None,
        existing_nullable=False,
    )
    op.alter_column(
        "quote_items",
        "product_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.alter_column(
        "quote_items",
        "quantity",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        postgresql_using="quantity::double precision",
        existing_nullable=False,
    )
    op.create_foreign_key(
        "fk_quote_items_service_id_services",
        "quote_items",
        "services",
        ["service_id"],
        ["id"],
    )
    op.create_check_constraint(
        "ck_quote_items_exactly_one_catalog_item",
        "quote_items",
        "(product_id IS NOT NULL AND service_id IS NULL) OR "
        "(product_id IS NULL AND service_id IS NOT NULL)",
    )
    op.create_check_constraint("ck_quote_items_quantity_positive", "quote_items", "quantity > 0")
    op.create_check_constraint("ck_quote_items_unit_price_positive", "quote_items", "unit_price > 0")
    op.create_check_constraint("ck_quote_items_line_total_nonnegative", "quote_items", "line_total >= 0")
    op.create_check_constraint(
        "ck_quote_items_unit",
        "quote_items",
        "unit IN ('unit', 'package', 'hour')",
    )


def downgrade() -> None:
    connection = op.get_bind()
    service_lines = connection.execute(
        sa.text("SELECT COUNT(*) FROM quote_items WHERE service_id IS NOT NULL")
    ).scalar_one()
    fractional_lines = connection.execute(
        sa.text("SELECT COUNT(*) FROM quote_items WHERE quantity <> TRUNC(quantity)")
    ).scalar_one()
    missing_durations = connection.execute(
        sa.text("SELECT COUNT(*) FROM services WHERE duration IS NULL")
    ).scalar_one()
    fixed_services = connection.execute(
        sa.text("SELECT COUNT(*) FROM services WHERE pricing_type = 'fixed'")
    ).scalar_one()
    if service_lines or fractional_lines or missing_durations or fixed_services:
        raise RuntimeError(
            "Downgrade refusé : des forfaits, lignes de service, quantités décimales "
            "ou durées nulles seraient perdus."
        )

    op.drop_constraint("ck_quote_items_unit", "quote_items", type_="check")
    op.drop_constraint("ck_quote_items_line_total_nonnegative", "quote_items", type_="check")
    op.drop_constraint("ck_quote_items_unit_price_positive", "quote_items", type_="check")
    op.drop_constraint("ck_quote_items_quantity_positive", "quote_items", type_="check")
    op.drop_constraint("ck_quote_items_exactly_one_catalog_item", "quote_items", type_="check")
    op.drop_constraint("fk_quote_items_service_id_services", "quote_items", type_="foreignkey")
    op.alter_column(
        "quote_items",
        "quantity",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        postgresql_using="quantity::integer",
        existing_nullable=False,
    )
    op.alter_column(
        "quote_items",
        "product_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column("quote_items", "unit")
    op.drop_column("quote_items", "item_name")
    op.drop_column("quote_items", "service_id")

    op.alter_column(
        "services",
        "duration",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_constraint("ck_services_duration_positive", "services", type_="check")
    op.drop_constraint("ck_services_price_positive", "services", type_="check")
    op.drop_constraint("ck_services_pricing_type", "services", type_="check")
    op.drop_column("services", "pricing_type")
    op.alter_column(
        "services",
        "price",
        new_column_name="hourly_rate",
        existing_type=sa.Float(),
        existing_nullable=False,
    )
