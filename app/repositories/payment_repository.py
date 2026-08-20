from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.invoice import Invoice
from app.models.quote import Quote
from app.models.customer import Customer


def create(
    db: Session,
    payment: Payment
) -> Payment:

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


def get_by_id(
    db: Session,
    payment_id: int,
    company_id: int,
) -> Payment | None:

    return (
        db.query(Payment)
        .join(Invoice)
        .join(Quote)
        .join(Customer)
        .filter(Payment.id == payment_id, Customer.company_id == company_id)
        .first()
    )


def get_all(
    db: Session,
    company_id: int,
) -> list[Payment]:

    return db.query(Payment).join(Invoice).join(Quote).join(Customer).filter(Customer.company_id == company_id).all()


def update(
    db: Session,
    payment: Payment
) -> Payment:

    db.commit()
    db.refresh(payment)

    return payment


def delete(
    db: Session,
    payment: Payment
):

    db.delete(payment)
    db.commit()
