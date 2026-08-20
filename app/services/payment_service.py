from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.payment import Payment
from app.repositories import payment_repository
from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
)
from app.models.user import User
from app.repositories import invoice_repository
from app.services.access import get_company_id


def create_payment(
    db: Session,
    payment_data: PaymentCreate,
    current_user: User,
) -> Payment:

    invoice = invoice_repository.get_by_id(db, payment_data.invoice_id, get_company_id(current_user))
    if invoice is None:
        raise ValueError("Facture introuvable")

    paid_total = sum(existing.amount for existing in invoice.payments)
    if paid_total + payment_data.amount > invoice.total:
        raise ValueError("Le paiement dépasse le solde restant de la facture")

    payment = Payment(
        invoice_id=payment_data.invoice_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        status="Completed",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    if paid_total + payment_data.amount >= invoice.total:
        invoice.status = "Paid"
    db.commit()
    db.refresh(payment)
    return payment


def get_payment(
    db: Session,
    payment_id: int,
    current_user: User,
) -> Payment:

    payment = payment_repository.get_by_id(
        db,
        payment_id,
        get_company_id(current_user),
    )

    if payment is None:
        raise ValueError("Paiement introuvable")

    return payment


def get_payments(
    db: Session,
    current_user: User,
) -> list[Payment]:

    return payment_repository.get_all(db, get_company_id(current_user))


def update_payment(
    db: Session,
    payment_id: int,
    payment_data: PaymentUpdate,
    current_user: User,
) -> Payment:

    payment = payment_repository.get_by_id(
        db,
        payment_id,
        get_company_id(current_user),
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
    payment_id: int,
    current_user: User,
):

    payment = payment_repository.get_by_id(
        db,
        payment_id,
        get_company_id(current_user),
    )

    if payment is None:
        raise ValueError("Paiement introuvable")

    payment_repository.delete(
        db,
        payment
    )
