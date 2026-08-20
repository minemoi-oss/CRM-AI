import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from pydantic import SecretStr, ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401 - register every mapped table
from app.core.config import Settings
from app.database.base import Base
from app.models.ai import AIUsageEvent
from app.models.company import Company
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.prospect import Prospect
from app.models.quote import Quote
from app.models.user import User
from app.schemas.ai import AIAskRequest
from app.services import ai_service
from app.services.ai_providers import (
    AIProviderError,
    AIProviderRequest,
    AIProviderResult,
    OpenAIResponsesProvider,
    build_ai_provider,
)


class FakeProvider:
    def __init__(
        self,
        text: str = "Réponse de test",
        *,
        name: str = "local",
        raises: AIProviderError | None = None,
    ):
        self.name = name
        self.model = "fake-test-v1"
        self.text = text
        self.raises = raises
        self.calls: list[AIProviderRequest] = []

    def generate(self, payload: AIProviderRequest) -> AIProviderResult:
        self.calls.append(payload)
        if self.raises is not None:
            raise self.raises
        return AIProviderResult(text=self.text, input_tokens=17, output_tokens=9)


class AIServiceTests(unittest.TestCase):
    def setUp(self):
        # Hermetic by construction: a developer's .env may intentionally use
        # OpenAI, but unit tests must never inherit that paid provider.
        self.local_provider_patch = patch.object(ai_service.settings, "AI_PROVIDER", "local")
        self.test_environment_patch = patch.object(ai_service.settings, "APP_ENV", "test")
        self.network_guard_patch = patch(
            "app.services.ai_providers.request.urlopen",
            side_effect=AssertionError("External AI/network calls are forbidden in tests."),
        )
        self.local_provider_patch.start()
        self.test_environment_patch.start()
        self.network_guard_patch.start()
        self.engine = create_engine("sqlite+pysqlite:///:memory:")

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db: Session = self.session_factory()
        self.user, self.company = self._create_tenant("owner", "Mine Corp")
        self.other_user, self.other_company = self._create_tenant("other", "Other Corp")
        self.customer = self._create_customer(
            self.company.id,
            "Alice",
            "Martin",
            "alice@example.com",
        )
        self.other_customer = self._create_customer(
            self.other_company.id,
            "Bob",
            "Secret",
            "bob@other.example",
        )

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.network_guard_patch.stop()
        self.test_environment_patch.stop()
        self.local_provider_patch.stop()

    def _create_tenant(self, username: str, company_name: str) -> tuple[User, Company]:
        user = User(
            username=username,
            email=f"{username}@example.com",
            hashed_password="hash",
        )
        self.db.add(user)
        self.db.flush()
        company = Company(
            name=company_name,
            email=f"{username}-company@example.com",
            phone="0612345678",
            owner_id=user.id,
        )
        self.db.add(company)
        self.db.commit()
        self.db.refresh(user)
        return user, company

    def _create_customer(
        self,
        company_id: int,
        first_name: str,
        last_name: str,
        email: str,
    ) -> Customer:
        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone="0611223344",
            company_id=company_id,
        )
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def test_customer_search_is_local_free_and_tenant_scoped(self):
        result = ai_service.search_customers(self.db, self.user, "alice", limit=10)

        self.assertEqual(result["total"], 1)
        self.assertEqual(result["items"][0]["id"], self.customer.id)
        self.assertNotIn(self.other_customer.id, [item["id"] for item in result["items"]])
        self.assertEqual(self.db.query(AIUsageEvent).count(), 0)

        with self.assertRaises(ai_service.AIInputValidationError):
            ai_service.search_customers(self.db, self.user, "   ", limit=10)

    def test_blank_generation_inputs_are_rejected_before_usage_is_reserved(self):
        provider = FakeProvider()
        with self.assertRaises(ai_service.AIInputValidationError):
            ai_service.ask_question(self.db, self.user, "   ", provider=provider)
        with self.assertRaises(ai_service.AIInputValidationError):
            ai_service.create_email_draft(
                self.db,
                self.user,
                customer_id=self.customer.id,
                objective="  ",
                tone="professional",
                language="fr",
                provider=provider,
            )
        self.assertEqual(provider.calls, [])
        self.assertEqual(self.db.query(AIUsageEvent).count(), 0)

    def test_question_uses_only_company_metrics_and_writes_pii_free_usage(self):
        response = ai_service.ask_question(
            self.db,
            self.user,
            "Combien de clients avons-nous ?",
        )

        self.assertIn("1 client", response["answer"])
        self.assertEqual(response["provider"], "local")
        self.assertTrue(response["request_id"])
        self.assertEqual(response["usage"]["estimated_cost_microusd"], 0)
        stored = self.db.query(AIUsageEvent).one()
        self.assertEqual(stored.company_id, self.company.id)
        self.assertEqual(stored.user_id, self.user.id)
        self.assertEqual(stored.status, "succeeded")
        self.assertIsNotNone(stored.duration_ms)
        column_names = set(AIUsageEvent.__table__.columns.keys())
        self.assertFalse({"prompt", "response", "context", "customer_email"} & column_names)

    def test_question_context_is_minimized_for_the_requested_domain(self):
        provider = FakeProvider("Vous avez zéro prospect.")

        ai_service.ask_question(
            self.db,
            self.user,
            "Combien de prospects avons-nous ?",
            provider=provider,
        )

        context = provider.calls[0].context
        self.assertEqual(
            set(context["metrics"]),
            {"prospects", "prospects_by_status"},
        )
        self.assertNotIn("recent_customers", context)
        self.assertNotIn("open_invoices", context)
        serialized = json.dumps(context, ensure_ascii=False)
        self.assertNotIn("Alice Martin", serialized)
        self.assertNotIn("invoice", serialized.casefold())

        client_provider = FakeProvider("Un client.")
        ai_service.ask_question(
            self.db,
            self.user,
            "Combien de clients avons-nous ?",
            provider=client_provider,
        )
        self.assertNotIn("recent_customers", client_provider.calls[0].context)

        invoice_provider = FakeProvider("Deux factures.")
        ai_service.ask_question(
            self.db,
            self.user,
            "Combien de factures sont impayées ?",
            provider=invoice_provider,
        )
        invoice_context = invoice_provider.calls[0].context
        self.assertNotIn("open_invoices", invoice_context)
        self.assertEqual(
            set(invoice_context["metrics"]),
            {"invoices", "pending_invoices", "invoiced_total", "outstanding_total"},
        )

    def test_cross_tenant_customer_actions_are_indistinguishable_and_never_call_provider(self):
        provider = FakeProvider("Objet: Test\nCorps:\nTest")

        with self.assertRaisesRegex(ai_service.AIResourceNotFoundError, "Client introuvable"):
            ai_service.create_email_draft(
                self.db,
                self.user,
                customer_id=self.other_customer.id,
                objective="un rendez-vous",
                tone="professional",
                language="fr",
                provider=provider,
            )
        with self.assertRaisesRegex(ai_service.AIResourceNotFoundError, "Client introuvable"):
            ai_service.summarize_customer(
                self.db,
                self.user,
                customer_id=self.other_customer.id,
                provider=provider,
            )

        self.assertEqual(provider.calls, [])
        self.assertEqual(self.db.query(AIUsageEvent).count(), 0)

    def test_email_is_a_draft_only_and_correlates_usage(self):
        provider = FakeProvider(
            "Objet: Proposition commerciale\nCorps:\nBonjour Alice,\n\nVoici notre proposition."
        )
        before_customers = self.db.query(Customer).count()

        response = ai_service.create_email_draft(
            self.db,
            self.user,
            customer_id=self.customer.id,
            objective="présenter notre proposition",
            tone="professional",
            language="fr",
            provider=provider,
        )

        self.assertEqual(response["subject"], "Proposition commerciale")
        self.assertTrue(response["is_draft"])
        self.assertIn("Bonjour Alice", response["body"])
        self.assertEqual(response["recipient"]["email"], "alice@example.com")
        self.assertEqual(self.db.query(Customer).count(), before_customers)
        event_row = self.db.query(AIUsageEvent).one()
        self.assertEqual(event_row.request_id, response["request_id"])
        self.assertEqual(event_row.action, "email_draft")
        self.assertNotIn("email", provider.calls[0].context["customer"])

    def test_question_can_list_open_invoice_clients_without_cross_tenant_data(self):
        own_quote = Quote(customer_id=self.customer.id, status="accepted", total=300)
        other_quote = Quote(customer_id=self.other_customer.id, status="accepted", total=800)
        self.db.add_all([own_quote, other_quote])
        self.db.flush()
        own_invoice = Invoice(
            invoice_number="INV-OPEN-OWN",
            quote_id=own_quote.id,
            status="Pending",
            total=300,
        )
        other_invoice = Invoice(
            invoice_number="INV-OPEN-OTHER",
            quote_id=other_quote.id,
            status="Pending",
            total=800,
        )
        self.db.add_all([own_invoice, other_invoice])
        self.db.flush()
        self.db.add(
            Payment(
                invoice_id=own_invoice.id,
                amount=100,
                payment_method="card",
                status="Completed",
                paid_at=datetime.now(timezone.utc),
            )
        )
        self.db.commit()

        response = ai_service.ask_question(
            self.db,
            self.user,
            "Quels clients ont des factures impayées ?",
        )

        self.assertIn("Alice Martin", response["answer"])
        self.assertIn("200.00 €", response["answer"])
        self.assertNotIn("Bob Secret", response["answer"])
        self.assertNotIn("INV-OPEN-OTHER", response["answer"])

    def test_summary_is_tenant_scoped_and_discloses_history_limit(self):
        quote = Quote(customer_id=self.customer.id, status="accepted", total=500)
        other_quote = Quote(customer_id=self.other_customer.id, status="accepted", total=99_999)
        self.db.add_all([quote, other_quote])
        self.db.flush()
        invoice = Invoice(
            invoice_number="INV-AI-001",
            quote_id=quote.id,
            status="Paid",
            total=500,
        )
        self.db.add(invoice)
        self.db.flush()
        self.db.add(
            Payment(
                invoice_id=invoice.id,
                amount=500,
                payment_method="card",
                status="Completed",
                paid_at=datetime.now(timezone.utc),
            )
        )
        self.db.add(
            Prospect(
                first_name="Alice",
                last_name="Martin",
                email="alice@example.com",
                phone="0611223344",
                status="converted",
                priority="high",
                company_id=self.company.id,
                customer_id=self.customer.id,
                converted_at=datetime.now(timezone.utc),
                notes="Rencontrée au salon.",
            )
        )
        self.db.commit()

        response = ai_service.summarize_customer(
            self.db,
            self.user,
            customer_id=self.customer.id,
        )

        self.assertIn("500.00 €", response["summary"])
        self.assertNotIn("99 999", response["summary"])
        self.assertIn("appels", response["warning"])
        self.assertIn("conversion", response["warning"])
        self.assertTrue(any("conversion" in item.casefold() for item in response["highlights"]))

    def test_history_totals_cover_all_rows_while_context_is_bounded(self):
        self.db.add_all(
            [
                Quote(customer_id=self.customer.id, status="draft", total=10)
                for _ in range(26)
            ]
        )
        self.db.commit()

        context, _highlights, truncated = ai_service._customer_history_context(
            self.db,
            self.customer,
            self.company.id,
            None,
        )

        self.assertEqual(context["metrics"]["quotes"], 26)
        self.assertEqual(context["metrics"]["quoted_total"], 260)
        self.assertEqual(len(context["quotes"]), 25)
        self.assertTrue(truncated)
        self.assertTrue(context["context_truncated"])

    def test_history_json_is_remeasured_and_hard_bounded_after_truncation(self):
        self.db.add_all(
            [
                Quote(customer_id=self.customer.id, status="draft", total=10)
                for _ in range(20)
            ]
        )
        self.db.add(
            Prospect(
                first_name="Alice",
                last_name="Martin",
                email="alice@example.com",
                phone="0611223344",
                status="converted",
                priority="high",
                company_id=self.company.id,
                customer_id=self.customer.id,
                converted_at=datetime.now(timezone.utc),
                organization="O" * 150,
                notes="N" * 5_000,
            )
        )
        self.db.commit()

        with patch.object(ai_service.settings, "AI_MAX_CONTEXT_CHARS", 1_000):
            context, _highlights, truncated = ai_service._customer_history_context(
                self.db,
                self.customer,
                self.company.id,
                "F" * 500,
            )

        serialized = json.dumps(context, ensure_ascii=False, default=str)
        self.assertLessEqual(len(serialized), 1_000)
        self.assertTrue(truncated)
        self.assertTrue(context["context_truncated"])
        self.assertEqual(context["metrics"]["quotes"], 20)

    def test_budget_reservation_uses_utf8_worst_case_token_bound(self):
        with (
            patch.object(ai_service.settings, "AI_MAX_INPUT_CHARS", 100),
            patch.object(ai_service.settings, "AI_MAX_CONTEXT_CHARS", 1_000),
            patch.object(ai_service.settings, "AI_MAX_OUTPUT_TOKENS", 64),
        ):
            reserved = ai_service._reserved_cost_microusd("openai")
            expected = ai_service._cost_microusd(
                ai_service.AI_REQUEST_OVERHEAD_TOKENS + 4 * (100 + 1_000),
                64,
                "openai",
            )
        self.assertEqual(reserved, expected)

    def test_schema_allows_deployment_limit_but_service_enforces_effective_limit(self):
        payload = AIAskRequest(question="x" * 5_000)
        self.assertEqual(len(payload.question), 5_000)
        provider = FakeProvider()
        with self.assertRaises(ai_service.AIInputTooLongError):
            ai_service.ask_question(
                self.db,
                self.user,
                payload.question,
                provider=provider,
            )
        self.assertEqual(provider.calls, [])

    def test_daily_quota_counts_started_requests_before_provider_call(self):
        provider = FakeProvider()
        with patch.object(ai_service.settings, "AI_DAILY_REQUEST_LIMIT", 1):
            ai_service.ask_question(self.db, self.user, "Donne-moi un résumé", provider=provider)
            with self.assertRaises(ai_service.AIQuotaExceededError):
                ai_service.ask_question(self.db, self.user, "Encore un résumé", provider=provider)

        self.assertEqual(len(provider.calls), 1)
        self.assertEqual(self.db.query(AIUsageEvent).count(), 1)

    def test_monthly_budget_blocks_before_paid_provider_call(self):
        provider = FakeProvider(name="openai")
        with patch.object(ai_service.settings, "AI_MONTHLY_BUDGET_MICROUSD", 1):
            with self.assertRaises(ai_service.AIQuotaExceededError):
                ai_service.ask_question(self.db, self.user, "Situation générale", provider=provider)

        self.assertEqual(provider.calls, [])
        self.assertEqual(self.db.query(AIUsageEvent).count(), 0)

    def test_provider_failure_is_audited_without_prompt_or_response(self):
        provider = FakeProvider(
            name="openai",
            raises=AIProviderError("Échec contrôlé", error_code="test_failure"),
        )
        with self.assertRaises(AIProviderError):
            ai_service.ask_question(
                self.db,
                self.user,
                "Cette question ne doit pas être stockée",
                provider=provider,
            )

        stored = self.db.query(AIUsageEvent).one()
        self.assertEqual(stored.status, "failed")
        self.assertEqual(stored.error_code, "test_failure")
        self.assertGreater(stored.estimated_cost_microusd, 0)
        self.assertEqual(stored.reserved_cost_microusd, 0)
        self.assertIsNotNone(stored.duration_ms)

    def test_status_explains_local_and_unconfigured_openai_modes(self):
        local = ai_service.get_status(self.db, self.user)
        self.assertTrue(local["ready"])
        self.assertEqual(local["provider"], "local")

        with (
            patch.object(ai_service.settings, "AI_PROVIDER", "openai"),
            patch.object(ai_service.settings, "OPENAI_API_KEY", None),
        ):
            openai = ai_service.get_status(self.db, self.user)
        self.assertFalse(openai["ready"])
        self.assertIn("aucune clé", openai["message"])


class OpenAIProviderContractTests(unittest.TestCase):
    def setUp(self):
        self.network_guard_patch = patch(
            "app.services.ai_providers.request.urlopen",
            side_effect=AssertionError("External AI/network calls are forbidden in tests."),
        )
        self.network_guard_patch.start()

    def tearDown(self):
        self.network_guard_patch.stop()

    def test_responses_request_is_private_bounded_and_low_reasoning(self):
        provider = OpenAIResponsesProvider(
            api_key="secret-test-key",
            model="gpt-5.6-luna",
            timeout_seconds=12,
        )
        payload = AIProviderRequest(
            task="ask",
            instructions="Répondre factuellement.",
            user_input="Combien de clients ?",
            context={"metrics": {"customers": 2}},
            max_output_tokens=321,
            safety_identifier="stable-hash",
        )
        captured = {}

        class FakeHTTPResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, *_args):
                return json.dumps(
                    {
                        "output": [
                            {
                                "type": "message",
                                "content": [{"type": "output_text", "text": "Deux clients."}],
                            }
                        ],
                        "usage": {"input_tokens": 10, "output_tokens": 3},
                    }
                ).encode("utf-8")

        def fake_urlopen(http_request, timeout):
            captured["request"] = http_request
            captured["timeout"] = timeout
            return FakeHTTPResponse()

        with patch("app.services.ai_providers.request.urlopen", side_effect=fake_urlopen):
            result = provider.generate(payload)

        sent = json.loads(captured["request"].data.decode("utf-8"))
        self.assertEqual(result.text, "Deux clients.")
        self.assertFalse(sent["store"])
        self.assertEqual(sent["max_output_tokens"], 321)
        self.assertEqual(sent["safety_identifier"], "stable-hash")
        self.assertEqual(sent["reasoning"], {"effort": "low"})
        self.assertEqual(sent["text"], {"verbosity": "low"})
        self.assertNotIn("secret-test-key", captured["request"].data.decode("utf-8"))
        self.assertEqual(captured["timeout"], 12)

    def test_provider_factory_refuses_external_ai_in_test_environment(self):
        with (
            patch.object(ai_service.settings, "APP_ENV", "test"),
            patch.object(ai_service.settings, "AI_PROVIDER", "openai"),
            patch.object(
                ai_service.settings,
                "OPENAI_API_KEY",
                SecretStr("test-key-that-must-never-be-used"),
            ),
        ):
            with self.assertRaises(AIProviderError) as context:
                build_ai_provider()
        self.assertEqual(
            context.exception.error_code,
            "external_provider_disabled_in_test",
        )

    def test_production_openai_requires_nonempty_secret(self):
        values = {
            "DB_NAME": "mine_crm",
            "DB_USER": "postgres",
            "DB_PASSWORD": "database-password",
            "DB_HOST": "localhost",
            "DB_PORT": 5432,
            "SECRET_KEY": "4bd31c49a5324c2a863baf3d8bd62f5b5fbca047fc44b52d",
            "ALGORITHM": "HS256",
            "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
            "APP_ENV": "production",
            "FRONTEND_URL": "https://app.mine-crm.example",
            "AUTH_ALLOWED_ORIGINS": "https://app.mine-crm.example",
            "SMTP_HOST": "smtp.example.com",
            "SMTP_FROM_EMAIL": "security@mine-crm.example",
            "SMTP_USE_TLS": True,
            "AI_ENABLED": True,
            "AI_PROVIDER": "openai",
            "OPENAI_API_KEY": "",
        }
        with self.assertRaises(ValidationError):
            Settings(**values)

    def test_incomplete_response_is_rejected_even_when_it_contains_partial_text(self):
        provider = OpenAIResponsesProvider(
            api_key="secret-test-key",
            model="gpt-5.6-luna",
            timeout_seconds=12,
        )
        payload = AIProviderRequest(
            task="ask",
            instructions="Répondre factuellement.",
            user_input="Question",
            context={"metrics": {"customers": 2}},
            max_output_tokens=100,
            safety_identifier="stable-hash",
        )

        class IncompleteHTTPResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, *_args):
                return json.dumps(
                    {
                        "status": "incomplete",
                        "incomplete_details": {"reason": "max_output_tokens"},
                        "output_text": "Texte partiel à ne pas afficher",
                        "usage": {"input_tokens": 10, "output_tokens": 100},
                    }
                ).encode("utf-8")

        with patch(
            "app.services.ai_providers.request.urlopen",
            return_value=IncompleteHTTPResponse(),
        ):
            with self.assertRaises(AIProviderError) as context:
                provider.generate(payload)
        self.assertEqual(context.exception.error_code, "openai_incomplete_response")

        class FailedHTTPResponse(IncompleteHTTPResponse):
            def read(self, *_args):
                return json.dumps(
                    {
                        "status": "failed",
                        "output_text": "Texte à ne pas afficher",
                        "usage": {"input_tokens": 10, "output_tokens": 2},
                    }
                ).encode("utf-8")

        with patch(
            "app.services.ai_providers.request.urlopen",
            return_value=FailedHTTPResponse(),
        ):
            with self.assertRaises(AIProviderError) as failed_context:
                provider.generate(payload)
        self.assertEqual(
            failed_context.exception.error_code,
            "openai_non_completed_response",
        )


if __name__ == "__main__":
    unittest.main()
