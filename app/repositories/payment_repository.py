from sqlalchemy.orm import Session

from app.models.payment import Payment


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
    payment_id: int
) -> Payment | None:

    return (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .first()
    )


def get_all(
    db: Session
) -> list[Payment]:

    return db.query(Payment).all()


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