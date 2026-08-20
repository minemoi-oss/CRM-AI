from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)
from app.services import payment_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


@router.post("", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return payment_service.create_payment(db, payment, current_user)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("", response_model=list[PaymentResponse])
def get_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return payment_service.get_payments(db, current_user)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return payment_service.get_payment(
            db,
            payment_id,
            current_user,
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
    current_user: User = Depends(get_current_user),
):
    try:
        return payment_service.update_payment(
            db,
            payment_id,
            payment,
            current_user,
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
    current_user: User = Depends(get_current_user),
):
    try:
        payment_service.delete_payment(
            db,
            payment_id,
            current_user,
        )

        return {
            "message": "Paiement supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Paiement introuvable"
        )
