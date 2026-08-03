from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)
from app.services import payment_service

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


@router.post("", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
):
    return payment_service.create_payment(
        db,
        payment
    )


@router.get("", response_model=list[PaymentResponse])
def get_payments(
    db: Session = Depends(get_db),
):
    return payment_service.get_payments(db)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    try:
        return payment_service.get_payment(
            db,
            payment_id
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Paiement introuvable"
        )


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payment: PaymentUpdate,
    db: Session = Depends(get_db),
):
    try:
        return payment_service.update_payment(
            db,
            payment_id,
            payment
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Paiement introuvable"
        )


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    try:
        payment_service.delete_payment(
            db,
            payment_id
        )

        return {
            "message": "Paiement supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Paiement introuvable"
        )