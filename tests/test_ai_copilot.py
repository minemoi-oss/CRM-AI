import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401 - register every mapped table
from app.database.base import Base
from app.models.ai import AIUsageEvent
from app.models.company import Company
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.product import Product
from app.models.quote import Quote
from app.models.service import Service
from app.models.user import User
from app.schemas.ai import CopilotHistoryResponse, CopilotResponse
from app.services import ai_copilot, ai_service
from app.services.ai_memory import CopilotProposalNotFoundError, copilot_memory
from app.services.ai_providers import AIProviderRequest, AIProviderResult


class FakeCopilotProvider:
    name = "local"
    model = "fake-copilot-v1"

    def __init__(self, text: str = "Réponse contextuelle vérifiée."):
        self.text = text
        self.calls: list[AIProviderRequest] = []

    def generate(self, payload: AIProviderRequest) -> AIProviderResult:
        self.calls.append(payload)
        return AIProviderResult(text=self.text, input_tokens=20, output_tokens=8)


class AICopilotTests(unittest.TestCase):
    def setUp(self):
        # Never inherit a developer's paid provider configuration.
        self.local_provider_patch = patch.object(ai_service.settings, "AI_PROVIDER", "local")
        self.test_environment_patch = patch.object(ai_service.settings, "APP_ENV", "test")
        self.network_guard_patch = patch(
            "app.services.ai_providers.request.urlopen",
            side_effect=AssertionError("External AI/network calls are forbidden in tests."),
        )
        self.local_provider_patch.start()
        self.test_environment_patch.start()
        self.network_guard_patch.start()
        copilot_memory.clear_all_for_tests()

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
        self.customer = self._create_customer(self.company.id, "Alice", "Martin")
        self.other_customer = self._create_customer(self.other_company.id, "Bob", "Secret")
        self.db.add_all(
            [
                Product(name="Mine Product", price=20, stock=2, company_id=self.company.id),
                Product(name="Secret Product", price=999, stock=0, company_id=self.other_company.id),
                Service(name="Mine Service", pricing_type="fixed", price=50, company_id=self.company.id),
                Service(name="Secret Service", pricing_type="fixed", price=999, company_id=self.other_company.id),
            ]
        )
        self.db.commit()
        self.session_id = str(uuid4())

    def tearDown(self):
        copilot_memory.clear_all_for_tests()
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

    def _create_customer(self, company_id: int, first_name: str, last_name: str) -> Customer:
        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.casefold()}@example.com",
            phone="0611223344",
            company_id=company_id,
        )
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def test_context_only_is_cost_free_structured_and_available_on_every_real_page(self):
        pages = (
            "dashboard",
            "ai",
            "clients",
            "prospects",
            "products",
            "services",
            "quotes",
            "invoices",
            "reports",
            "settings",
        )
        for page in pages:
            with self.subTest(page=page):
                response = ai_copilot.copilot(
                    self.db,
                    self.user,
                    session_id=self.session_id,
                    page=page,
                    question=None,
                    active_entity=None,
                )
                validated = CopilotResponse.model_validate(response)
                self.assertEqual(validated.page, page)
                self.assertIsNone(validated.request_id)
                self.assertIsNone(validated.usage)
                self.assertTrue(validated.blocks)
                self.assertTrue(validated.suggestions)

        self.assertEqual(self.db.query(AIUsageEvent).count(), 0)
        self.assertEqual(ai_copilot.history(self.session_id)["items"], [])

    def test_question_is_journaled_and_short_memory_is_isolated_by_auth_session(self):
        provider = FakeCopilotProvider()
        first = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Combien de clients avons-nous ?",
            active_entity=None,
            provider=provider,
        )
        second = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Et que dois-je faire ensuite ?",
            active_entity=None,
            provider=provider,
        )

        self.assertTrue(first["request_id"])
        self.assertTrue(second["request_id"])
        self.assertEqual(len(provider.calls), 2)
        self.assertEqual(provider.calls[0].task, "copilot")
        self.assertEqual(provider.calls[0].context["conversation"], [])
        self.assertEqual(len(provider.calls[1].context["conversation"]), 2)
        self.assertIn("Combien de clients", provider.calls[1].context["conversation"][0]["content"])
        self.assertEqual(len(ai_copilot.history(self.session_id)["items"]), 4)
        self.assertEqual(ai_copilot.history(str(uuid4()))["items"], [])
        self.assertEqual(
            [row.action for row in self.db.query(AIUsageEvent).order_by(AIUsageEvent.id)],
            ["copilot", "copilot"],
        )

    def test_provider_memory_is_scoped_to_same_page_and_same_active_entity(self):
        second_customer = self._create_customer(self.company.id, "Charlie", "Durand")
        provider = FakeCopilotProvider()

        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Résume ce client.",
            active_entity={"type": "customer", "id": self.customer.id},
            provider=provider,
        )
        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="dashboard",
            question="Résume le tableau de bord.",
            active_entity=None,
            provider=provider,
        )
        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Résume cet autre client.",
            active_entity={"type": "customer", "id": second_customer.id},
            provider=provider,
        )
        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Et quelle est la prochaine étape ?",
            active_entity={"type": "customer", "id": self.customer.id},
            provider=provider,
        )

        self.assertEqual(provider.calls[0].context["conversation"], [])
        self.assertEqual(provider.calls[1].context["conversation"], [])
        self.assertEqual(provider.calls[2].context["conversation"], [])
        reused = provider.calls[3].context["conversation"]
        self.assertEqual(len(reused), 2)
        self.assertIn("Résume ce client", reused[0]["content"])
        self.assertNotIn("tableau de bord", json.dumps(reused, ensure_ascii=False))
        self.assertNotIn("autre client", json.dumps(reused, ensure_ascii=False))

        global_history = ai_copilot.history(self.session_id)
        validated = CopilotHistoryResponse.model_validate(global_history)
        self.assertEqual(len(validated.items), 8)
        self.assertEqual(validated.items[0].entity_type, "customer")
        self.assertEqual(validated.items[0].entity_id, self.customer.id)
        self.assertIsNone(validated.items[2].entity_type)
        self.assertIsNone(validated.items[2].entity_id)

    def test_active_entity_is_revalidated_and_cross_tenant_resource_is_hidden(self):
        with self.assertRaises(ai_copilot.CopilotResourceNotFoundError):
            ai_copilot.copilot(
                self.db,
                self.user,
                session_id=self.session_id,
                page="clients",
                question=None,
                active_entity={"type": "customer", "id": self.other_customer.id},
            )

        response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question=None,
            active_entity={"type": "customer", "id": self.customer.id},
        )
        serialized = json.dumps(response, ensure_ascii=False, default=str)
        self.assertIn("Alice Martin", serialized)
        self.assertNotIn("Bob Secret", serialized)

    def test_page_context_and_provider_data_never_include_other_tenant_catalog(self):
        provider = FakeCopilotProvider()
        response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="products",
            question="Liste les produits avec un stock faible.",
            active_entity=None,
            provider=provider,
        )

        provider_json = json.dumps(provider.calls[0].context, ensure_ascii=False)
        response_json = json.dumps(response, ensure_ascii=False, default=str)
        self.assertIn("Mine Product", provider_json)
        self.assertNotIn("Secret Product", provider_json)
        self.assertNotIn("Secret Product", response_json)

    def test_invoice_and_quote_rows_expose_only_tenant_safe_navigation_links(self):
        own_quote = Quote(customer_id=self.customer.id, status="draft", total=120)
        other_quote = Quote(customer_id=self.other_customer.id, status="draft", total=999)
        self.db.add_all([own_quote, other_quote])
        self.db.flush()
        own_invoice = Invoice(
            invoice_number="INV-COPILOT-OWN",
            quote_id=own_quote.id,
            status="Pending",
            total=120,
        )
        other_invoice = Invoice(
            invoice_number="INV-COPILOT-OTHER",
            quote_id=other_quote.id,
            status="Pending",
            total=999,
        )
        self.db.add_all([own_invoice, other_invoice])
        self.db.commit()

        invoice_response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="invoices",
            question=None,
            active_entity=None,
        )
        CopilotResponse.model_validate(invoice_response)
        invoice_table = next(
            block for block in invoice_response["blocks"] if block["type"] == "table"
        )
        self.assertEqual(invoice_table["rows"][0]["link"]["entity_id"], own_invoice.id)
        self.assertEqual(invoice_table["rows"][0]["link"]["page"], "invoices")
        self.assertNotIn("INV-COPILOT-OTHER", json.dumps(invoice_response, default=str))

        quote_response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="quotes",
            question=None,
            active_entity=None,
        )
        CopilotResponse.model_validate(quote_response)
        quote_table = next(
            block for block in quote_response["blocks"] if block["type"] == "table"
        )
        self.assertEqual(quote_table["rows"][0]["link"]["entity_id"], own_quote.id)
        self.assertEqual(quote_table["rows"][0]["link"]["page"], "quotes")
        self.assertNotIn(other_quote.id, [row["id"] for row in quote_table["rows"]])

    def test_open_invoices_expose_due_date_and_put_overdue_rows_first(self):
        overdue_quote = Quote(customer_id=self.customer.id, status="accepted", total=200)
        current_quote = Quote(customer_id=self.customer.id, status="accepted", total=100)
        self.db.add_all([overdue_quote, current_quote])
        self.db.flush()
        now = datetime.now(timezone.utc)
        overdue_created_at = now - timedelta(days=45)
        current_created_at = now - timedelta(days=5)
        overdue_invoice = Invoice(
            invoice_number="INV-OVERDUE",
            quote_id=overdue_quote.id,
            status="Pending",
            total=200,
            created_at=overdue_created_at,
        )
        current_invoice = Invoice(
            invoice_number="INV-CURRENT",
            quote_id=current_quote.id,
            status="Pending",
            total=100,
            created_at=current_created_at,
        )
        self.db.add_all([current_invoice, overdue_invoice])
        self.db.commit()

        response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="invoices",
            question=None,
            active_entity=None,
        )
        table = next(block for block in response["blocks"] if block["type"] == "table")
        rows = table["rows"]

        self.assertEqual(rows[0]["id"], overdue_invoice.id)
        self.assertTrue(rows[0]["is_overdue"])
        self.assertEqual(rows[0]["overdue_label"], "En retard")
        self.assertEqual(
            rows[0]["due_date"],
            (overdue_created_at + timedelta(days=30)).date().isoformat(),
        )
        current_row = next(row for row in rows if row["id"] == current_invoice.id)
        self.assertFalse(current_row["is_overdue"])
        self.assertEqual(current_row["overdue_label"], "À venir")

    def test_active_customer_summary_receives_bounded_tenant_history(self):
        own_quote = Quote(customer_id=self.customer.id, status="accepted", total=300)
        other_quote = Quote(customer_id=self.other_customer.id, status="accepted", total=9_999)
        self.db.add_all([own_quote, other_quote])
        self.db.flush()
        own_invoice = Invoice(
            invoice_number="INV-HISTORY-OWN",
            quote_id=own_quote.id,
            status="Paid",
            total=300,
        )
        other_invoice = Invoice(
            invoice_number="INV-HISTORY-OTHER",
            quote_id=other_quote.id,
            status="Paid",
            total=9_999,
        )
        self.db.add_all([own_invoice, other_invoice])
        self.db.commit()
        provider = FakeCopilotProvider()

        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Résume l’historique de ce client.",
            active_entity={"type": "customer", "id": self.customer.id},
            provider=provider,
        )

        active = provider.calls[0].context["active_entity"]
        self.assertNotIn("email", active)
        self.assertEqual(active["history"]["metrics"]["quotes"], 1)
        self.assertEqual(active["history"]["metrics"]["invoices"], 1)
        self.assertTrue(active["history_highlights"])
        serialized = json.dumps(active, ensure_ascii=False, default=str)
        self.assertIn("INV-HISTORY-OWN", serialized)
        self.assertNotIn("INV-HISTORY-OTHER", serialized)
        self.assertLessEqual(
            len(json.dumps(provider.calls[0].context, ensure_ascii=False, default=str)),
            ai_service.settings.AI_MAX_CONTEXT_CHARS,
        )

    def test_active_invoice_has_balance_due_date_and_overdue_context(self):
        quote = Quote(customer_id=self.customer.id, status="accepted", total=400)
        self.db.add(quote)
        self.db.flush()
        created_at = datetime.now(timezone.utc) - timedelta(days=40)
        invoice = Invoice(
            invoice_number="INV-REMINDER",
            quote_id=quote.id,
            status="Pending",
            total=400,
            created_at=created_at,
        )
        self.db.add(invoice)
        self.db.flush()
        self.db.add(
            Payment(
                invoice_id=invoice.id,
                amount=150,
                payment_method="card",
                status="Completed",
                paid_at=datetime.now(timezone.utc),
            )
        )
        self.db.commit()
        provider = FakeCopilotProvider()

        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="invoices",
            question="Prépare une relance pour cette facture.",
            active_entity={"type": "invoice", "id": invoice.id},
            provider=provider,
        )

        active = provider.calls[0].context["active_entity"]
        self.assertEqual(active["paid"], 150)
        self.assertEqual(active["outstanding"], 250)
        self.assertEqual(active["due_date"], (created_at + timedelta(days=30)).date().isoformat())
        self.assertTrue(active["is_overdue"])

    def test_clients_followup_context_contains_only_tenant_open_balances(self):
        own_quote = Quote(customer_id=self.customer.id, status="accepted", total=180)
        other_quote = Quote(customer_id=self.other_customer.id, status="accepted", total=8_000)
        self.db.add_all([own_quote, other_quote])
        self.db.flush()
        self.db.add_all(
            [
                Invoice(
                    invoice_number="INV-FOLLOWUP-OWN",
                    quote_id=own_quote.id,
                    status="Pending",
                    total=180,
                ),
                Invoice(
                    invoice_number="INV-FOLLOWUP-OTHER",
                    quote_id=other_quote.id,
                    status="Pending",
                    total=8_000,
                ),
            ]
        )
        self.db.commit()
        provider = FakeCopilotProvider()

        response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Quels clients relancer pour leurs impayés ?",
            active_entity=None,
            provider=provider,
        )

        page_data = provider.calls[0].context["page_data"]
        self.assertNotIn("recent_customers", page_data)
        self.assertIn("clients_with_open_balance", page_data)
        serialized_context = json.dumps(page_data, ensure_ascii=False, default=str)
        self.assertIn("INV-FOLLOWUP-OWN", serialized_context)
        self.assertNotIn("INV-FOLLOWUP-OTHER", serialized_context)
        serialized_response = json.dumps(response, ensure_ascii=False, default=str)
        self.assertNotIn("INV-FOLLOWUP-OTHER", serialized_response)

    def test_proposal_confirmation_never_executes_sensitive_mutation(self):
        provider = FakeCopilotProvider()
        before = self.db.query(Customer).count()
        response = ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Supprime le client sélectionné.",
            active_entity={"type": "customer", "id": self.customer.id},
            provider=provider,
        )

        proposal = response["proposals"][0]
        self.assertTrue(proposal["requires_confirmation"])
        self.assertEqual(proposal["execution_mode"], "proposal_only")
        confirmation = ai_copilot.confirm_proposal(
            self.session_id,
            proposal["proposal_id"],
        )
        self.assertEqual(confirmation["status"], "confirmed")
        self.assertFalse(confirmation["executed"])
        self.assertEqual(self.db.query(Customer).count(), before)
        self.assertIsNotNone(self.db.get(Customer, self.customer.id))

        with self.assertRaises(CopilotProposalNotFoundError):
            ai_copilot.confirm_proposal(str(uuid4()), proposal["proposal_id"])

    def test_memory_is_bounded_and_provider_context_respects_hard_limit(self):
        provider = FakeCopilotProvider("A" * 1_000)
        with (
            patch.object(ai_service.settings, "AI_COPILOT_MAX_TURNS", 2),
            patch.object(ai_service.settings, "AI_COPILOT_MEMORY_MESSAGE_CHARS", 1_000),
        ):
            for index in range(3):
                ai_copilot.copilot(
                    self.db,
                    self.user,
                    session_id=self.session_id,
                    page="dashboard",
                    question=f"Question contextuelle {index}",
                    active_entity=None,
                    provider=provider,
                )
            history = ai_copilot.history(self.session_id)
        self.assertEqual(len(history["items"]), 4)
        self.assertNotIn("Question contextuelle 0", json.dumps(history, default=str))

        bounded_provider = FakeCopilotProvider()
        with patch.object(ai_service.settings, "AI_MAX_CONTEXT_CHARS", 1_000):
            ai_copilot.copilot(
                self.db,
                self.user,
                session_id=self.session_id,
                page="dashboard",
                question="Résumé maintenant",
                active_entity=None,
                provider=bounded_provider,
            )
        serialized_context = json.dumps(
            bounded_provider.calls[0].context,
            ensure_ascii=False,
            default=str,
        )
        self.assertLessEqual(len(serialized_context), 1_000)

    def test_clear_history_removes_messages_and_proposals_for_only_that_session(self):
        provider = FakeCopilotProvider()
        other_session = str(uuid4())
        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=self.session_id,
            page="clients",
            question="Propose une modification du client.",
            active_entity={"type": "customer", "id": self.customer.id},
            provider=provider,
        )
        ai_copilot.copilot(
            self.db,
            self.user,
            session_id=other_session,
            page="dashboard",
            question="Résumé",
            active_entity=None,
            provider=provider,
        )

        cleared = ai_copilot.clear_history(self.session_id)
        self.assertEqual(cleared["items"], [])
        self.assertEqual(cleared["memory"]["turns"], 0)
        self.assertEqual(len(ai_copilot.history(other_session)["items"]), 2)


if __name__ == "__main__":
    unittest.main()
