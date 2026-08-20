from datetime import datetime, timezone

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.quote import Quote


def _datetime_timestamp(value: datetime) -> float:
    """Return a comparable timestamp for both naive and timezone-aware DB dates."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.timestamp()


def _invoice_query(db: Session, company_id: int):
    return db.query(Invoice).join(Quote).join(Customer).filter(Customer.company_id == company_id)


def _payment_query(db: Session, company_id: int):
    return db.query(Payment).join(Invoice).join(Quote).join(Customer).filter(Customer.company_id == company_id)


def get_dashboard(db: Session, company_id: int, months: int = 6) -> dict:
    now = datetime.now(timezone.utc)
    customers_query = db.query(Customer).filter(Customer.company_id == company_id)
    invoices_query = _invoice_query(db, company_id)
    payments_query = _payment_query(db, company_id)

    total_clients = customers_query.count()
    total_quotes = db.query(Quote).join(Customer).filter(Customer.company_id == company_id).count()
    total_invoices = invoices_query.count()
    pending_invoices = invoices_query.filter(func.lower(Invoice.status).in_(["draft", "pending", "en attente"])).count()
    monthly_revenue = payments_query.filter(
        extract("year", Payment.created_at) == now.year,
        extract("month", Payment.created_at) == now.month,
    ).with_entities(func.coalesce(func.sum(Payment.amount), 0)).scalar()
    conversion_rate = (total_invoices / total_quotes * 100) if total_quotes else 0

    monthly = []
    month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    for offset in range(months - 1, -1, -1):
        month_index = now.month - offset
        year = now.year
        while month_index <= 0:
            month_index += 12
            year -= 1
        value = payments_query.filter(
            extract("year", Payment.created_at) == year,
            extract("month", Payment.created_at) == month_index,
        ).with_entities(func.coalesce(func.sum(Payment.amount), 0)).scalar()
        monthly.append({"month": month_names[month_index - 1], "value": float(value or 0)})

    recent_clients = customers_query.order_by(Customer.created_at.desc()).limit(4).all()
    recent_invoices = invoices_query.order_by(Invoice.created_at.desc()).limit(3).all()
    recent_payments = payments_query.order_by(Payment.created_at.desc()).limit(3).all()
    activities = []
    for customer in recent_clients:
        activities.append({"id": f"client-{customer.id}", "title": "Nouveau client", "description": f"{customer.first_name} {customer.last_name} a été ajouté", "created_at": customer.created_at, "type": "client"})
    for invoice in recent_invoices:
        activities.append({"id": f"invoice-{invoice.id}", "title": "Nouvelle facture", "description": f"Facture {invoice.invoice_number} créée", "created_at": invoice.created_at, "type": "invoice"})
    for payment in recent_payments:
        activities.append({"id": f"payment-{payment.id}", "title": "Paiement reçu", "description": f"Paiement de {payment.amount:.2f} €", "created_at": payment.created_at, "type": "payment"})
    activities.sort(
        key=lambda item: _datetime_timestamp(item["created_at"]),
        reverse=True,
    )

    return {
        "total_clients": total_clients,
        "monthly_revenue": float(monthly_revenue or 0),
        "pending_invoices": pending_invoices,
        "conversion_rate": round(conversion_rate, 1),
        "monthly_revenues": monthly,
        "recent_clients": [
            {"id": customer.id, "name": f"{customer.first_name} {customer.last_name}", "email": customer.email, "company": "Votre entreprise", "status": "Actif"}
            for customer in recent_clients
        ],
        "recent_activities": [
            {**item, "created_at": item["created_at"].isoformat()}
            for item in activities[:10]
        ],
    }


def get_report(db: Session, company_id: int, months: int = 6) -> dict:
    dashboard = get_dashboard(db, company_id, months=months)
    invoices = _invoice_query(db, company_id).all()
    payments = _payment_query(db, company_id).all()
    total_invoiced = sum(invoice.total for invoice in invoices)
    total_paid = sum(payment.amount for payment in payments)
    return {
        "total_invoiced": float(total_invoiced),
        "total_paid": float(total_paid),
        "outstanding": float(max(total_invoiced - total_paid, 0)),
        "invoice_count": len(invoices),
        "client_count": dashboard["total_clients"],
        "conversion_rate": dashboard["conversion_rate"],
        "monthly_revenues": dashboard["monthly_revenues"],
    }
