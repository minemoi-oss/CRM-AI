from datetime import datetime

from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.repositories import invoice_repository
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


def create_invoice(
    db: Session,
    invoice_data: InvoiceCreate
) -> Invoice:

    invoice = Invoice(
        invoice_number=f"FAC-{int(datetime.now().timestamp())}",
        quote_id=invoice_data.quote_id,
        status="Draft",
        total=0,
    )

    return invoice_repository.create(
        db,
        invoice
    )


def get_invoice(
    db: Session,
    invoice_id: int
) -> Invoice:

    invoice = invoice_repository.get_by_id(
        db,
        invoice_id
    )

    if invoice is None:
        raise ValueError("Facture introuvable")

    return invoice


def get_invoices(
    db: Session
) -> list[Invoice]:

    return invoice_repository.get_all(db)


def update_invoice(
    db: Session,
    invoice_id: int,
    invoice_data: InvoiceUpdate
) -> Invoice:

    invoice = invoice_repository.get_by_id(
        db,
        invoice_id
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
    invoice_id: int
):

    invoice = invoice_repository.get_by_id(
        db,
        invoice_id
    )

    if invoice is None:
        raise ValueError("Facture introuvable")

    invoice_repository.delete(
        db,
        invoice
    )