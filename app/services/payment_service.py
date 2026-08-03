from datetime import datetime

from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.repositories import payment_repository
from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
)


def create_payment(
    db: Session,
    payment_data: PaymentCreate
) -> Payment:

    payment = Payment(
        invoice_id=payment_data.invoice_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        status="Pending",
        paid_at=datetime.utcnow(),
    )

    return payment_repository.create(
        db,
        payment
    )


def get_payment(
    db: Session,
    payment_id: int
) -> Payment:

    payment = payment_repository.get_by_id(
        db,
        payment_id
    )

    if payment is None:
        raise ValueError("Paiement introuvable")

    return payment


def get_payments(
    db: Session
) -> list[Payment]:

    return payment_repository.get_all(db)


def update_payment(
    db: Session,
    payment_id: int,
    payment_data: PaymentUpdate
) -> Payment:

    payment = payment_repository.get_by_id(
        db,
        payment_id
    )

    if payment is None:
        raise ValueError("Paiement introuvable")

    payment.status = payment_data.status

    return payment_repository.update(
        db,
        payment
    )


def delete_payment(
    db: Session,
    payment_id: int
):

    payment = payment_repository.get_by_id(
        db,
        payment_id
    )

    if payment is None:
        raise ValueError("Paiement introuvable")

    payment_repository.delete(
        db,
        payment
    )