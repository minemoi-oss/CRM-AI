from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
)
from app.services import invoice_service

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


@router.post("", response_model=InvoiceResponse)
def create_invoice(
    invoice: InvoiceCreate,
    db: Session = Depends(get_db),
):
    return invoice_service.create_invoice(
        db,
        invoice
    )


@router.get("", response_model=list[InvoiceResponse])
def get_invoices(
    db: Session = Depends(get_db),
):
    return invoice_service.get_invoices(db)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    try:
        return invoice_service.get_invoice(
            db,
            invoice_id
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
):
    try:
        return invoice_service.update_invoice(
            db,
            invoice_id,
            invoice
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
):
    try:
        invoice_service.delete_invoice(
            db,
            invoice_id
        )

        return {
            "message": "Facture supprimée."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Facture introuvable"
        )