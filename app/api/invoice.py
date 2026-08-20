from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
)
from app.services import invoice_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


@router.post("", response_model=InvoiceResponse)
def create_invoice(
    invoice: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return invoice_service.create_invoice(db, invoice, current_user)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.get("", response_model=list[InvoiceResponse])
def get_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return invoice_service.get_invoices(db, current_user)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return invoice_service.get_invoice(
            db,
            invoice_id,
            current_user,
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable"
        )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return invoice_service.update_invoice(
            db,
            invoice_id,
            invoice,
            current_user,
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable"
        )


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        invoice_service.delete_invoice(
            db,
            invoice_id,
            current_user,
        )

        return {
            "message": "Facture supprimée."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable"
        )
