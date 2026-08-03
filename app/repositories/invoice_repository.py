from sqlalchemy.orm import Session

from app.models.invoice import Invoice


def create(
    db: Session,
    invoice: Invoice
) -> Invoice:

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return invoice


def get_by_id(
    db: Session,
    invoice_id: int
) -> Invoice | None:

    return (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .first()
    )


def get_all(
    db: Session
) -> list[Invoice]:

    return db.query(Invoice).all()


def update(
    db: Session,
    invoice: Invoice
) -> Invoice:

    db.commit()
    db.refresh(invoice)

    return invoice


def delete(
    db: Session,
    invoice: Invoice
):

    db.delete(invoice)
    db.commit()