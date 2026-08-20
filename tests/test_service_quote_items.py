import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from pydantic import ValidationError

from app.schemas.quote_item import QuoteLineCreate
from app.schemas.service import ServiceCreate
from app.services.quote_item_service import build_quote_item


class ServicePricingTests(unittest.TestCase):
    def test_fixed_service_accepts_a_price_without_duration(self):
        service = ServiceCreate(
            name="Audit forfaitaire",
            pricing_type="fixed",
            price=450,
        )

        self.assertEqual(service.pricing_type, "fixed")
        self.assertEqual(service.price, 450)
        self.assertIsNone(service.duration)

    def test_service_rejects_an_unknown_pricing_type(self):
        with self.assertRaises(ValidationError):
            ServiceCreate(
                name="Audit forfaitaire",
                pricing_type="daily",
                price=450,
            )


class QuoteLineValidationTests(unittest.TestCase):
    def test_line_requires_exactly_one_catalog_item(self):
        with self.assertRaises(ValidationError):
            QuoteLineCreate(quantity=1)

        with self.assertRaises(ValidationError):
            QuoteLineCreate(product_id=1, service_id=2, quantity=1)

    def test_product_line_uses_the_catalog_price_and_an_integer_quantity(self):
        db = MagicMock()
        product = SimpleNamespace(id=3, name="Clavier", price=49.95)

        with patch(
            "app.services.quote_item_service.product_respositori.get_by_id",
            return_value=product,
        ) as get_product:
            item = build_quote_item(
                db,
                QuoteLineCreate(product_id=3, quantity=2),
                company_id=9,
                quote_id=11,
            )

        get_product.assert_called_once_with(db, 3, 9)
        self.assertEqual(item.product_id, 3)
        self.assertIsNone(item.service_id)
        self.assertEqual(item.item_name, "Clavier")
        self.assertEqual(item.unit, "unit")
        self.assertEqual(item.unit_price, 49.95)
        self.assertEqual(item.line_total, 99.9)

        with patch(
            "app.services.quote_item_service.product_respositori.get_by_id",
            return_value=product,
        ):
            with self.assertRaises(ValueError):
                build_quote_item(
                    db,
                    QuoteLineCreate(product_id=3, quantity=1.5),
                    company_id=9,
                    quote_id=11,
                )

    def test_fixed_service_is_billed_by_package(self):
        db = MagicMock()
        service = SimpleNamespace(
            id=4,
            name="Installation",
            pricing_type="fixed",
            price=75.5,
        )

        with patch(
            "app.services.quote_item_service.service_repository.get_by_id",
            return_value=service,
        ) as get_service:
            item = build_quote_item(
                db,
                QuoteLineCreate(service_id=4, quantity=2),
                company_id=9,
                quote_id=11,
            )

        get_service.assert_called_once_with(db, 4, 9)
        self.assertIsNone(item.product_id)
        self.assertEqual(item.service_id, 4)
        self.assertEqual(item.unit, "package")
        self.assertEqual(item.line_total, 151)

        with patch(
            "app.services.quote_item_service.service_repository.get_by_id",
            return_value=service,
        ):
            with self.assertRaises(ValueError):
                build_quote_item(
                    db,
                    QuoteLineCreate(service_id=4, quantity=1.5),
                    company_id=9,
                    quote_id=11,
                )

    def test_hourly_service_accepts_fractional_hours(self):
        db = MagicMock()
        service = SimpleNamespace(
            id=5,
            name="Accompagnement",
            pricing_type="hourly",
            price=80,
        )

        with patch(
            "app.services.quote_item_service.service_repository.get_by_id",
            return_value=service,
        ):
            item = build_quote_item(
                db,
                QuoteLineCreate(service_id=5, quantity=1.5),
                company_id=9,
                quote_id=11,
            )

        self.assertEqual(item.unit, "hour")
        self.assertEqual(item.quantity, 1.5)
        self.assertEqual(item.line_total, 120)


if __name__ == "__main__":
    unittest.main()
