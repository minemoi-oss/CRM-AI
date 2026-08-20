import unittest
from unittest.mock import patch

from pydantic import SecretStr
from sqlalchemy import make_url

from app.core.config import settings
from app.database.session import build_database_url
from scripts.start_production import trusted_proxy_ips


class ProductionReadinessTests(unittest.TestCase):
    def test_production_proxy_trust_rejects_wildcard(self):
        with patch.dict("os.environ", {"UVICORN_FORWARDED_ALLOW_IPS": "*"}):
            with self.assertRaises(SystemExit):
                trusted_proxy_ips()

    def test_production_proxy_trust_normalizes_explicit_entries(self):
        with patch.dict(
            "os.environ",
            {"UVICORN_FORWARDED_ALLOW_IPS": " 127.0.0.1, 10.0.0.0/8 "},
        ):
            self.assertEqual(trusted_proxy_ips(), "127.0.0.1,10.0.0.0/8")

    def test_managed_database_url_uses_psycopg_and_keeps_required_ssl(self):
        with (
            patch.object(
                settings,
                "DATABASE_URL",
                SecretStr(
                    "postgresql://minecrm:secret@db.mine-crm.example:5432/mine_crm?sslmode=require"
                ),
            ),
            patch.object(settings, "DB_SSLMODE", "require"),
        ):
            url = make_url(build_database_url())

        self.assertEqual(url.drivername, "postgresql+psycopg")
        self.assertEqual(url.host, "db.mine-crm.example")
        self.assertEqual(url.query["sslmode"], "require")

    def test_local_database_password_is_encoded_without_changing_its_value(self):
        password = "p@ss:/?# with spaces"
        with (
            patch.object(settings, "DATABASE_URL", None),
            patch.object(settings, "DB_NAME", "mine_crm"),
            patch.object(settings, "DB_USER", "minecrm"),
            patch.object(settings, "DB_PASSWORD", SecretStr(password)),
            patch.object(settings, "DB_HOST", "localhost"),
            patch.object(settings, "DB_PORT", 5432),
            patch.object(settings, "DB_SSLMODE", "prefer"),
        ):
            url = make_url(build_database_url())

        self.assertEqual(url.password, password)
        self.assertEqual(url.query["sslmode"], "prefer")


if __name__ == "__main__":
    unittest.main()
