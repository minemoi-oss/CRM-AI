from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.repositories import invoice_repository
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.models.user import User
from app.repositories import quote_repository
from app.services.access import get_company_id


def create_invoice(
    db: Session,
    invoice_data: InvoiceCreate,
    current_user: User,
) -> Invoice:

    quote = quote_repository.get_by_id(db, invoice_data.quote_id, get_company_id(current_user))
    if quote is None:
        raise ValueError("Devis introuvable")

    invoice = Invoice(
        invoice_number=f"FAC-{uuid4().hex[:12].upper()}",
        quote_id=invoice_data.quote_id,
        status="Draft",
        total=quote.total,
    )

    return invoice_repository.create(
        db,
        invoice
    )


def get_invoice(
    db: Session,
    invoice_id: int,
    current_user: User,
) -> Invoice:

    invoice = invoice_repository.get_by_id(
        db,
        invoice_id,
        get_company_id(current_user),
    )

    if invoice is None:
        raise ValueError("Facture introuvable")

    return invoice


def get_invoices(
    db: Session,
    current_user: User,
) -> list[Invoice]:

    return invoice_repository.get_all(db, get_company_id(current_user))


def update_invoice(
    db: Session,
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    current_user: User,
) -> Invoice:

    invoice = invoice_repository.get_by_id(
        db,
        invoice_id,
        get_company_id(current_user),
    )

    if invoice is None:
        raise ValueError("Facture introuvable")

    invoice.status = invoice_data.status

    return invoice_repository.update(
        db,
        invoice
    )


def delete_invoice(
    db: Session,
    invoice_id: int,
    current_user: User,
):

    invoice = invoice_repository.get_by_id(
        db,
        invoice_id,
        get_company_id(current_user),
    )

    if invoice is None:
        raise ValueError("Facture introuvable")

    invoice_repository.delete(
        db,
        invoice
    )
