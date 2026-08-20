from __future__ import annotations

from dataclasses import dataclass
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import re
from typing import Any
from uuid import uuid4

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dashboard.service import get_report
from app.models.auth import AuthSession
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.product import Product
from app.models.prospect import Prospect
from app.models.quote import Quote
from app.models.service import Service
from app.models.user import User
from app.services import ai_service
from app.services.access import get_company_id
from app.services.ai_memory import CopilotProposalNotFoundError, copilot_memory
from app.services.ai_providers import AIProvider


PAGE_LABELS = {
    "dashboard": "Tableau de bord",
    "ai": "Assistant IA",
    "clients": "Clients",
    "prospects": "Prospects",
    "products": "Produits",
    "services": "Services",
    "quotes": "Devis",
    "invoices": "Factures",
    "reports": "Rapports",
    "settings": "Paramètres",
}


class CopilotResourceNotFoundError(RuntimeError):
    pass


@dataclass
class _PageContext:
    summary: str
    provider_data: dict[str, Any]
    blocks: list[dict[str, Any]]
    suggestions: list[dict[str, str]]
    sources: list[dict[str, str]]


def _link(page: str, entity_type: str | None = None, entity_id: int | None = None, query: str | None = None):
    return {
        "page": page,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "query": query,
    }


def _metric(label: str, value: str | int | float, format_name: str, page: str):
    return {"label": label, "value": value, "format": format_name, "link": _link(page)}


def _detail_intent(question: str | None) -> bool:
    if not question:
        return False
    return bool(
        re.search(
            r"\b(?:qui|quel|quels|quelle|quelles|liste|montre|affiche|détail|details?|"
            r"numéro|numero|nom|noms)\b",
            question.casefold(),
        )
    )


def _group_counts(db: Session, model, field, *filters) -> dict[str, int]:
    rows = db.query(field, func.count(model.id)).filter(*filters).group_by(field).all()
    return {str(key): int(value) for key, value in rows}


def _active_entity(
    db: Session,
    company_id: int,
    active: dict[str, Any] | None,
    question: str | None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    if active is None:
        return None, None
    entity_type = str(active["type"])
    entity_id = int(active["id"])
    provider_entity: dict[str, Any]
    card: dict[str, Any]

    if entity_type == "customer":
        entity = db.query(Customer).filter(
            Customer.id == entity_id,
            Customer.company_id == company_id,
        ).one_or_none()
        if entity is None:
            raise CopilotResourceNotFoundError("Ressource introuvable.")
        title = f"{entity.first_name} {entity.last_name}"
        provider_entity = {
            "type": entity_type,
            "id": entity.id,
            "title": title,
            "created_at": entity.created_at.date().isoformat(),
        }
        if question and re.search(
            r"\b(?:résum\w*|resum\w*|historique|bilan)\b",
            question.casefold(),
        ):
            history_context, highlights, truncated = ai_service._customer_history_context(
                db,
                entity,
                company_id,
                None,
            )
            provider_entity["history"] = history_context
            provider_entity["history_highlights"] = highlights
            provider_entity["history_truncated"] = truncated
            provider_entity["history_scope_warning"] = ai_service.SUMMARY_SCOPE_WARNING
        card = {
            "id": entity.id,
            "title": title,
            "subtitle": entity.email,
            "meta": "Client",
            "link": _link("clients", entity_type, entity.id),
        }
    elif entity_type == "prospect":
        entity = db.query(Prospect).filter(
            Prospect.id == entity_id,
            Prospect.company_id == company_id,
        ).one_or_none()
        if entity is None:
            raise CopilotResourceNotFoundError("Ressource introuvable.")
        title = f"{entity.first_name} {entity.last_name}"
        provider_entity = {
            "type": entity_type,
            "id": entity.id,
            "title": title,
            "organization": entity.organization,
            "status": entity.status,
            "priority": entity.priority,
        }
        card = {
            "id": entity.id,
            "title": title,
            "subtitle": entity.organization,
            "meta": f"{entity.status} · {entity.priority}",
            "link": _link("prospects", entity_type, entity.id),
        }
    elif entity_type == "invoice":
        row = (
            db.query(Invoice, Customer)
            .join(Quote, Invoice.quote_id == Quote.id)
            .join(Customer, Quote.customer_id == Customer.id)
            .filter(Invoice.id == entity_id, Customer.company_id == company_id)
            .one_or_none()
        )
        if row is None:
            raise CopilotResourceNotFoundError("Ressource introuvable.")
        entity, customer = row
        customer_name = f"{customer.first_name} {customer.last_name}"
        paid_total = (
            db.query(func.coalesce(func.sum(Payment.amount), 0))
            .filter(
                Payment.invoice_id == entity.id,
                func.lower(Payment.status).in_(["completed", "paid", "payée", "payee"]),
            )
            .scalar()
            or 0
        )
        created_at = entity.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        due_date = created_at + timedelta(days=30)
        outstanding = max(float(entity.total or 0) - float(paid_total), 0)
        provider_entity = {
            "type": entity_type,
            "id": entity.id,
            "title": entity.invoice_number,
            "customer": customer_name,
            "status": entity.status,
            "total": float(entity.total or 0),
            "paid": float(paid_total),
            "outstanding": outstanding,
            "due_date": due_date.date().isoformat(),
            "is_overdue": outstanding > 0 and due_date < datetime.now(timezone.utc),
        }
        card = {
            "id": entity.id,
            "title": entity.invoice_number,
            "subtitle": customer_name,
            "meta": f"{entity.status} · reste {outstanding:.2f} €",
            "link": _link("invoices", entity_type, entity.id),
        }
    elif entity_type == "quote":
        row = (
            db.query(Quote, Customer)
            .join(Customer, Quote.customer_id == Customer.id)
            .filter(Quote.id == entity_id, Customer.company_id == company_id)
            .one_or_none()
        )
        if row is None:
            raise CopilotResourceNotFoundError("Ressource introuvable.")
        entity, customer = row
        customer_name = f"{customer.first_name} {customer.last_name}"
        provider_entity = {
            "type": entity_type,
            "id": entity.id,
            "title": f"Devis #{entity.id}",
            "customer": customer_name,
            "status": entity.status,
            "total": float(entity.total or 0),
        }
        card = {
            "id": entity.id,
            "title": f"Devis #{entity.id}",
            "subtitle": customer_name,
            "meta": f"{entity.status} · {float(entity.total or 0):.2f} €",
            "link": _link("quotes", entity_type, entity.id),
        }
    elif entity_type == "service":
        entity = db.query(Service).filter(
            Service.id == entity_id,
            Service.company_id == company_id,
        ).one_or_none()
        if entity is None:
            raise CopilotResourceNotFoundError("Ressource introuvable.")
        provider_entity = {
            "type": entity_type,
            "id": entity.id,
            "title": entity.name,
            "pricing_type": entity.pricing_type,
            "price": float(entity.price),
        }
        card = {
            "id": entity.id,
            "title": entity.name,
            "subtitle": entity.pricing_type,
            "meta": f"{float(entity.price):.2f} €",
            "link": _link("services", entity_type, entity.id),
        }
    elif entity_type == "product":
        entity = db.query(Product).filter(
            Product.id == entity_id,
            Product.company_id == company_id,
        ).one_or_none()
        if entity is None:
            raise CopilotResourceNotFoundError("Ressource introuvable.")
        provider_entity = {
            "type": entity_type,
            "id": entity.id,
            "title": entity.name,
            "price": float(entity.price),
            "stock": int(entity.stock),
        }
        card = {
            "id": entity.id,
            "title": entity.name,
            "subtitle": f"Stock : {entity.stock}",
            "meta": f"{float(entity.price):.2f} €",
            "link": _link("products", entity_type, entity.id),
        }
    else:
        raise CopilotResourceNotFoundError("Ressource introuvable.")

    return provider_entity, {
        "type": "entity_cards",
        "entity_type": entity_type,
        "items": [card],
    }


def _build_page_context(
    db: Session,
    current_user: User,
    page: str,
    question: str | None,
) -> _PageContext:
    company_id = get_company_id(current_user)
    metrics = ai_service._company_metrics(db, company_id)
    detailed = _detail_intent(question)
    sources: list[dict[str, str]] = []
    suggestions: list[dict[str, str]] = []
    blocks: list[dict[str, Any]] = []
    provider_data: dict[str, Any] = {}

    if page == "dashboard":
        provider_data = {"metrics": metrics}
        blocks.append(
            {
                "type": "metric_cards",
                "items": [
                    _metric("Clients", metrics["customers"], "number", "clients"),
                    _metric("Prospects", metrics["prospects"], "number", "prospects"),
                    _metric("Factures en attente", metrics["pending_invoices"], "number", "invoices"),
                    _metric("Encaissé", metrics["paid_total"], "currency", "reports"),
                ],
            }
        )
        suggestions = [
            {"id": "dashboard-priorities", "label": "Priorités du jour", "prompt": "Quelles sont mes priorités aujourd’hui ?"},
            {"id": "dashboard-open-invoices", "label": "Factures à suivre", "prompt": "Quels clients ont des factures impayées ?"},
        ]
        summary = (
            f"le CRM compte {metrics['customers']} clients, {metrics['prospects']} prospects et "
            f"{metrics['pending_invoices']} factures en attente."
        )
        sources.append({"kind": "crm_metrics", "label": "Indicateurs CRM"})
    elif page == "clients":
        followup_balances = bool(
            question
            and re.search(
                r"\b(?:relanc\w*|impay\w*|solde\w*|rappel\w*|retard\w*)\b",
                question.casefold(),
            )
        )
        provider_data = {"customer_count": metrics["customers"]}
        blocks.append(
            {"type": "metric_cards", "items": [_metric("Total clients", metrics["customers"], "number", "clients")]}
        )
        if followup_balances:
            open_invoices, open_truncated = ai_service._open_invoices(db, company_id)
            provider_data["clients_with_open_balance"] = open_invoices
            provider_data["open_balances_truncated"] = open_truncated
            blocks.append(
                {
                    "type": "table",
                    "columns": [
                        {"key": "customer_name", "label": "Client"},
                        {"key": "invoice_number", "label": "Facture"},
                        {"key": "due_date", "label": "Échéance"},
                        {"key": "outstanding", "label": "Reste"},
                    ],
                    "rows": [
                        {
                            **item,
                            "link": _link("invoices", "invoice", int(item["id"])),
                        }
                        for item in open_invoices
                    ],
                    "link": _link("invoices"),
                },
            )
            summary = (
                f"{len(open_invoices)} facture(s) à solde ouvert sont proposées pour relance "
                f"parmi {metrics['customers']} clients."
            )
            sources.extend(
                [
                    {"kind": "customers", "label": "Fiches clients de votre entreprise"},
                    {"kind": "open_invoices", "label": "Factures à solde ouvert"},
                ]
            )
        else:
            recent = (
                db.query(Customer)
                .filter(Customer.company_id == company_id)
                .order_by(Customer.created_at.desc(), Customer.id.desc())
                .limit(5)
                .all()
            )
            if detailed:
                provider_data["recent_customers"] = [
                    {"id": item.id, "name": f"{item.first_name} {item.last_name}"}
                    for item in recent
                ]
            blocks.append(
                {
                    "type": "entity_cards",
                    "entity_type": "customer",
                    "items": [
                        {
                            "id": item.id,
                            "title": f"{item.first_name} {item.last_name}",
                            "subtitle": item.email,
                            "meta": item.created_at.date().isoformat(),
                            "link": _link("clients", "customer", item.id),
                        }
                        for item in recent
                    ],
                }
            )
            summary = f"{metrics['customers']} clients sont disponibles, avec {len(recent)} fiches récentes affichées."
            sources.append({"kind": "customers", "label": "Fiches clients de votre entreprise"})
        suggestions = [
            {"id": "clients-recent", "label": "Clients récents", "prompt": "Montre-moi les clients les plus récents."},
            {"id": "clients-followup", "label": "Préparer un suivi", "prompt": "Propose un suivi client professionnel."},
        ]
    elif page == "prospects":
        statuses = metrics["prospects_by_status"]
        priority_counts = _group_counts(db, Prospect, Prospect.priority, Prospect.company_id == company_id)
        priority_items = (
            db.query(Prospect)
            .filter(Prospect.company_id == company_id, Prospect.status != "converted")
            .order_by(
                case(
                    (Prospect.priority == "high", 0),
                    (Prospect.priority == "medium", 1),
                    else_=2,
                ),
                Prospect.created_at.desc(),
            )
            .limit(5)
            .all()
        )
        provider_data = {"total": metrics["prospects"], "by_status": statuses, "by_priority": priority_counts}
        if detailed:
            provider_data["priority_prospects"] = [
                {"id": item.id, "name": f"{item.first_name} {item.last_name}", "status": item.status, "priority": item.priority}
                for item in priority_items
            ]
        blocks.extend(
            [
                {
                    "type": "metric_cards",
                    "items": [
                        _metric("Total prospects", metrics["prospects"], "number", "prospects"),
                        _metric("Qualifiés", statuses.get("qualified", 0), "number", "prospects"),
                        _metric("Priorité haute", priority_counts.get("high", 0), "number", "prospects"),
                    ],
                },
                {
                    "type": "entity_cards",
                    "entity_type": "prospect",
                    "items": [
                        {
                            "id": item.id,
                            "title": f"{item.first_name} {item.last_name}",
                            "subtitle": item.organization,
                            "meta": f"{item.status} · {item.priority}",
                            "link": _link("prospects", "prospect", item.id),
                        }
                        for item in priority_items
                    ],
                },
            ]
        )
        suggestions = [
            {"id": "prospects-priority", "label": "Prospects prioritaires", "prompt": "Quels prospects dois-je contacter en priorité ?"},
            {"id": "prospects-convert", "label": "Préparer une conversion", "prompt": "Propose la conversion du prospect sélectionné en client."},
        ]
        summary = f"{metrics['prospects']} prospects sont suivis, dont {statuses.get('qualified', 0)} qualifiés."
        sources.append({"kind": "prospects", "label": "Prospects de votre entreprise"})
    elif page == "invoices":
        open_invoices, open_truncated = ai_service._open_invoices(db, company_id)
        provider_data = {
            "invoice_count": metrics["invoices"],
            "pending_count": metrics["pending_invoices"],
            "invoiced_total": metrics["invoiced_total"],
            "outstanding_total": metrics["outstanding_total"],
        }
        if detailed:
            provider_data["open_invoices"] = open_invoices
            provider_data["open_invoices_truncated"] = open_truncated
        blocks.extend(
            [
                {
                    "type": "metric_cards",
                    "items": [
                        _metric("Factures", metrics["invoices"], "number", "invoices"),
                        _metric("En attente", metrics["pending_invoices"], "number", "invoices"),
                        _metric("Reste à encaisser", metrics["outstanding_total"], "currency", "invoices"),
                    ],
                },
                {
                    "type": "table",
                    "columns": [
                        {"key": "invoice_number", "label": "Facture"},
                        {"key": "customer_name", "label": "Client"},
                        {"key": "status", "label": "Statut"},
                        {"key": "due_date", "label": "Échéance"},
                        {"key": "overdue_label", "label": "Retard"},
                        {"key": "outstanding", "label": "Reste"},
                    ],
                    "rows": [
                        {
                            **row,
                            "overdue_label": "En retard" if row["is_overdue"] else "À venir",
                            "link": _link("invoices", "invoice", int(row["id"])),
                        }
                        for row in open_invoices[:8]
                    ],
                    "link": _link("invoices"),
                },
            ]
        )
        suggestions = [
            {"id": "invoices-open", "label": "Soldes ouverts", "prompt": "Liste les factures avec un solde ouvert."},
            {"id": "invoices-reminder", "label": "Préparer un rappel", "prompt": "Propose un rappel pour la facture sélectionnée."},
        ]
        summary = f"{metrics['invoices']} factures représentent {metrics['invoiced_total']:.2f} €, avec {metrics['outstanding_total']:.2f} € restant à encaisser."
        sources.append({"kind": "invoices", "label": "Factures et paiements de votre entreprise"})
    elif page == "quotes":
        quote_rows = (
            db.query(Quote, Customer)
            .join(Customer, Quote.customer_id == Customer.id)
            .filter(Customer.company_id == company_id)
            .order_by(Quote.created_at.desc(), Quote.id.desc())
            .limit(8)
            .all()
        )
        # Explicit joined aggregation keeps status counts tenant-scoped.
        statuses = {
            str(key): int(value)
            for key, value in (
                db.query(Quote.status, func.count(Quote.id))
                .join(Customer, Quote.customer_id == Customer.id)
                .filter(Customer.company_id == company_id)
                .group_by(Quote.status)
                .all()
            )
        }
        provider_data = {"count": metrics["quotes"], "total": metrics["quoted_total"], "by_status": statuses}
        if detailed:
            provider_data["recent_quotes"] = [
                {"id": quote.id, "customer": f"{customer.first_name} {customer.last_name}", "status": quote.status, "total": float(quote.total or 0)}
                for quote, customer in quote_rows
            ]
        blocks.extend(
            [
                {
                    "type": "metric_cards",
                    "items": [
                        _metric("Devis", metrics["quotes"], "number", "quotes"),
                        _metric("Montant devisé", metrics["quoted_total"], "currency", "quotes"),
                        _metric("Brouillons", statuses.get("draft", 0), "number", "quotes"),
                    ],
                },
                {
                    "type": "table",
                    "columns": [{"key": "id", "label": "Devis"}, {"key": "customer", "label": "Client"}, {"key": "status", "label": "Statut"}, {"key": "total", "label": "Total"}],
                    "rows": [
                        {
                            "id": quote.id,
                            "customer": f"{customer.first_name} {customer.last_name}",
                            "status": quote.status,
                            "total": float(quote.total or 0),
                            "link": _link("quotes", "quote", quote.id),
                        }
                        for quote, customer in quote_rows
                    ],
                    "link": _link("quotes"),
                },
            ]
        )
        suggestions = [
            {"id": "quotes-drafts", "label": "Devis à terminer", "prompt": "Quels devis brouillons dois-je terminer ?"},
            {"id": "quotes-followup", "label": "Préparer une relance", "prompt": "Propose une relance pour le devis sélectionné."},
        ]
        summary = f"{metrics['quotes']} devis totalisent {metrics['quoted_total']:.2f} €."
        sources.append({"kind": "quotes", "label": "Devis de votre entreprise"})
    elif page == "services":
        items = db.query(Service).filter(Service.company_id == company_id).order_by(Service.name).limit(10).all()
        total_count = db.query(func.count(Service.id)).filter(Service.company_id == company_id).scalar() or 0
        pricing_counts = _group_counts(
            db,
            Service,
            Service.pricing_type,
            Service.company_id == company_id,
        )
        provider_data = {
            "count": int(total_count),
            "by_pricing_type": pricing_counts,
            "catalog": [{"id": item.id, "name": item.name, "pricing_type": item.pricing_type, "price": float(item.price)} for item in items],
        }
        blocks.extend(
            [
                {"type": "metric_cards", "items": [_metric("Services", int(total_count), "number", "services")]},
                {"type": "table", "columns": [{"key": "name", "label": "Service"}, {"key": "pricing_type", "label": "Tarification"}, {"key": "price", "label": "Prix"}], "rows": provider_data["catalog"], "link": _link("services")},
            ]
        )
        suggestions = [
            {"id": "services-pricing", "label": "Analyser les tarifs", "prompt": "Résume la tarification de mes services."},
            {"id": "services-update", "label": "Proposer une amélioration", "prompt": "Propose une amélioration du service sélectionné."},
        ]
        summary = f"le catalogue contient {int(total_count)} services."
        sources.append({"kind": "services", "label": "Catalogue de services"})
    elif page == "products":
        total_count = db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0
        low_stock_count = (
            db.query(func.count(Product.id))
            .filter(Product.company_id == company_id, Product.stock <= 5)
            .scalar()
            or 0
        )
        low_stock = (
            db.query(Product)
            .filter(Product.company_id == company_id, Product.stock <= 5)
            .order_by(Product.stock, Product.name)
            .limit(10)
            .all()
        )
        provider_data = {
            "count": int(total_count),
            "low_stock_count": int(low_stock_count),
            "low_stock": [{"id": item.id, "name": item.name, "stock": item.stock, "price": float(item.price)} for item in low_stock],
        }
        blocks.extend(
            [
                {"type": "metric_cards", "items": [_metric("Produits", int(total_count), "number", "products"), _metric("Stock faible", int(low_stock_count), "number", "products")]},
                {"type": "table", "columns": [{"key": "name", "label": "Produit"}, {"key": "stock", "label": "Stock"}, {"key": "price", "label": "Prix"}], "rows": provider_data["low_stock"], "link": _link("products")},
            ]
        )
        suggestions = [
            {"id": "products-stock", "label": "Stocks faibles", "prompt": "Quels produits ont un stock faible ?"},
            {"id": "products-update", "label": "Proposer une mise à jour", "prompt": "Propose une mise à jour du produit sélectionné."},
        ]
        summary = f"le catalogue contient {int(total_count)} produits, dont {int(low_stock_count)} avec un stock inférieur ou égal à 5."
        sources.append({"kind": "products", "label": "Catalogue de produits"})
    elif page == "reports":
        report = get_report(db, company_id, months=6)
        provider_data = report
        blocks.extend(
            [
                {
                    "type": "metric_cards",
                    "items": [
                        _metric("Facturé", report["total_invoiced"], "currency", "reports"),
                        _metric("Encaissé", report["total_paid"], "currency", "reports"),
                        _metric("Encours", report["outstanding"], "currency", "reports"),
                        _metric("Conversion", report["conversion_rate"], "percent", "reports"),
                    ],
                },
                {"type": "table", "columns": [{"key": "month", "label": "Mois"}, {"key": "value", "label": "Revenu"}], "rows": report["monthly_revenues"], "link": _link("reports")},
            ]
        )
        suggestions = [
            {"id": "reports-summary", "label": "Résumer la performance", "prompt": "Résume les performances des six derniers mois."},
            {"id": "reports-gap", "label": "Analyser l’encours", "prompt": "Explique le montant restant à encaisser."},
        ]
        summary = f"{report['total_invoiced']:.2f} € ont été facturés et {report['total_paid']:.2f} € encaissés."
        sources.append({"kind": "reports", "label": "Rapport financier CRM"})
    elif page == "settings":
        company = current_user.company
        assert company is not None
        profile_fields = [company.name, company.email, company.phone, company.website]
        completed = sum(bool(value) for value in profile_fields)
        completeness = round(completed / len(profile_fields) * 100)
        now = datetime.now(timezone.utc)
        active_sessions = (
            db.query(func.count(AuthSession.id))
            .filter(
                AuthSession.user_id == current_user.id,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
            .scalar()
            or 0
        )
        provider_data = {
            "profile_completeness_percent": completeness,
            "email_verified": bool(current_user.email_verified),
            "active_sessions": int(active_sessions),
        }
        blocks.append(
            {
                "type": "metric_cards",
                "items": [
                    _metric("Profil complété", completeness, "percent", "settings"),
                    _metric("E-mail vérifié", "Oui" if current_user.email_verified else "Non", "text", "settings"),
                    _metric("Sessions actives", int(active_sessions), "number", "settings"),
                ],
            }
        )
        suggestions = [
            {"id": "settings-security", "label": "Vérifier la sécurité", "prompt": "Quels réglages de sécurité dois-je vérifier ?"},
            {"id": "settings-profile", "label": "Compléter le profil", "prompt": "Que manque-t-il pour compléter mon profil entreprise ?"},
        ]
        summary = f"le profil entreprise est complété à {completeness}% et {int(active_sessions)} session(s) sont actives."
        sources.append({"kind": "settings", "label": "État non sensible du compte et de l’entreprise"})
    elif page == "ai":
        status = ai_service.get_status(db, current_user)
        usage = status["usage"]
        provider_data = {
            "provider": status["provider"],
            "ready": status["ready"],
            "requests_today": usage["requests_today"],
            "requests_this_month": usage["requests_this_month"],
            "estimated_cost_microusd_this_month": usage["estimated_cost_microusd_this_month"],
        }
        blocks.append(
            {
                "type": "metric_cards",
                "items": [
                    _metric("Requêtes aujourd’hui", usage["requests_today"], "number", "ai"),
                    _metric("Requêtes ce mois", usage["requests_this_month"], "number", "ai"),
                    _metric("Coût estimé", usage["estimated_cost_usd_this_month"], "currency", "ai"),
                ],
            }
        )
        suggestions = [
            {"id": "ai-capabilities", "label": "Voir les capacités", "prompt": "Que peux-tu faire dans mon CRM ?"},
            {"id": "ai-usage", "label": "Comprendre l’usage", "prompt": "Résume mon utilisation IA de ce mois."},
        ]
        summary = f"le fournisseur {status['provider']} est {'prêt' if status['ready'] else 'indisponible'} et {usage['requests_today']} requête(s) ont été utilisées aujourd’hui."
        sources.append({"kind": "ai_usage", "label": "Usage IA de votre entreprise"})
    else:
        raise ai_service.AIInputValidationError("Page copilote inconnue.")

    return _PageContext(
        summary=summary,
        provider_data=provider_data,
        blocks=blocks,
        suggestions=suggestions[:4],
        sources=sources,
    )


def _bound_provider_context(context: dict[str, Any]) -> dict[str, Any]:
    def size() -> int:
        return len(json.dumps(context, ensure_ascii=False, default=str))

    conversation = context.get("conversation")
    while size() > settings.AI_MAX_CONTEXT_CHARS and isinstance(conversation, list) and conversation:
        conversation.pop(0)

    page_data = context.get("page_data")
    if isinstance(page_data, dict):
        detail_keys = (
            "recent_customers",
            "clients_with_open_balance",
            "priority_prospects",
            "open_invoices",
            "recent_quotes",
            "catalog",
            "low_stock",
            "monthly_revenues",
        )
        while size() > settings.AI_MAX_CONTEXT_CHARS:
            populated = [key for key in detail_keys if isinstance(page_data.get(key), list) and page_data[key]]
            if not populated:
                break
            largest = max(populated, key=lambda key: len(page_data[key]))
            page_data[largest].pop()

    active_entity = context.get("active_entity")
    history = active_entity.get("history") if isinstance(active_entity, dict) else None
    if isinstance(history, dict):
        history_detail_keys = ("payments", "invoices", "quotes")
        while size() > settings.AI_MAX_CONTEXT_CHARS:
            populated = [
                key
                for key in history_detail_keys
                if isinstance(history.get(key), list) and history[key]
            ]
            if not populated:
                break
            largest = max(populated, key=lambda key: len(history[key]))
            history[largest].pop()
            history["context_truncated"] = True
        if size() > settings.AI_MAX_CONTEXT_CHARS:
            source_prospect = history.get("source_prospect")
            if isinstance(source_prospect, dict):
                source_prospect.pop("notes", None)
                source_prospect.pop("organization", None)
        if size() > settings.AI_MAX_CONTEXT_CHARS:
            active_entity["history"] = {
                "customer": history.get("customer"),
                "metrics": history.get("metrics"),
                "context_truncated": True,
            }

    if size() > settings.AI_MAX_CONTEXT_CHARS:
        context.pop("active_entity", None)
    if size() > settings.AI_MAX_CONTEXT_CHARS:
        raise ai_service.AIInputValidationError("Le contexte du copilote dépasse la limite configurée.")
    return context


def _proposals(
    page: str,
    question: str | None,
    active: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    if not question or not re.search(
        r"\b(?:propose|prépare|prepare|crée|creer|créer|ajoute|modifie|change|supprime|"
        r"envoie|convertis?|marque|relance|rappel)\b",
        question.casefold(),
    ):
        return []
    lowered = question.casefold()
    if "mail" in lowered or "email" in lowered or "rappel" in lowered or "relance" in lowered:
        action, title = "prepare_email_draft", "Préparer un brouillon d’e-mail"
    elif "convert" in lowered:
        action, title = "propose_prospect_conversion", "Proposer la conversion du prospect"
    elif "supprim" in lowered:
        action, title = "propose_deletion", "Examiner une suppression"
    else:
        action, title = "propose_update", f"Proposer une modification — {PAGE_LABELS[page]}"
    entity_type = active.get("type") if active else None
    entity_id = int(active["id"]) if active else None
    return [
        {
            "proposal_id": str(uuid4()),
            "action": action,
            "title": title,
            "description": "Cette proposition doit être confirmée. Aucune donnée CRM ne sera modifiée par ce prototype.",
            "requires_confirmation": True,
            "execution_mode": "proposal_only",
            "entity_type": entity_type,
            "entity_id": entity_id,
        }
    ]


def copilot(
    db: Session,
    current_user: User,
    *,
    session_id: str,
    page: str,
    question: str | None,
    active_entity: dict[str, Any] | None,
    provider: AIProvider | None = None,
) -> dict[str, Any]:
    company_id = get_company_id(current_user)
    if question is not None:
        question = ai_service._validate_input_length(question)
    page_context = _build_page_context(db, current_user, page, question)
    active_provider, active_block = _active_entity(
        db,
        company_id,
        active_entity,
        question,
    )
    blocks = list(page_context.blocks)
    if active_block is not None:
        blocks.insert(0, active_block)

    proposals = _proposals(page, question, active_entity)
    if question is None:
        message = f"Copilote prêt pour la page {PAGE_LABELS[page]}. {page_context.summary}"
        request_id = None
        usage = None
    else:
        provider_context = _bound_provider_context(
            {
                "page": page,
                "page_label": PAGE_LABELS[page],
                "page_summary": page_context.summary,
                "page_data": deepcopy(page_context.provider_data),
                "active_entity": active_provider,
                "conversation": copilot_memory.context_messages(
                    session_id,
                    page=page,
                    active_entity=active_entity,
                ),
                "proposals_are_non_executing": True,
            }
        )
        generated = ai_service.generate_copilot_message(
            db,
            current_user,
            question=question,
            context=provider_context,
            provider=provider,
        )
        message = generated["message"]
        request_id = generated["request_id"]
        usage = generated["usage"]
        copilot_memory.append_turn(
            session_id,
            page=page,
            user_content=question,
            assistant_content=message,
            active_entity=active_entity,
        )
        blocks.insert(0, {"type": "text", "text": message})

    copilot_memory.remember_proposals(session_id, proposals)
    return {
        "request_id": request_id,
        "message": message,
        "page": page,
        "blocks": blocks,
        "suggestions": page_context.suggestions,
        "proposals": proposals,
        "sources": page_context.sources,
        "usage": usage,
        "memory": copilot_memory.info(session_id),
    }


def history(session_id: str) -> dict[str, Any]:
    return {
        "items": copilot_memory.history(session_id),
        "memory": copilot_memory.info(session_id),
    }


def clear_history(session_id: str) -> dict[str, Any]:
    copilot_memory.clear_session(session_id)
    return {"items": [], "memory": copilot_memory.info(session_id)}


def confirm_proposal(session_id: str, proposal_id: str) -> dict[str, Any]:
    proposal = copilot_memory.confirm_proposal(session_id, proposal_id)
    return {
        "proposal_id": proposal["proposal_id"],
        "status": "confirmed",
        "executed": False,
        "message": (
            "Proposition confirmée. Aucune mutation CRM n’a été exécutée ; "
            "vous gardez le contrôle de l’action finale."
        ),
    }


__all__ = [
    "CopilotProposalNotFoundError",
    "CopilotResourceNotFoundError",
    "clear_history",
    "confirm_proposal",
    "copilot",
    "history",
]
