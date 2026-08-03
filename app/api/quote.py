from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
)
from app.services import quote_service

router = APIRouter(
    prefix="/quotes",
    tags=["Quotes"],
)


@router.post("", response_model=QuoteResponse)
def create_quote(
    quote: QuoteCreate,
    db: Session = Depends(get_db),
):
    return quote_service.create_quote(db, quote)


@router.get("", response_model=list[QuoteResponse])
def get_quotes(
    db: Session = Depends(get_db),
):
    return quote_service.get_quotes(db)


@router.get("/{quote_id}", response_model=QuoteResponse)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
):
    try:
        return quote_service.get_quote(
            db,
            quote_id,
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Devis introuvable",
        )


@router.put("/{quote_id}", response_model=QuoteResponse)
def update_quote(
    quote_id: int,
    quote: QuoteUpdate,
    db: Session = Depends(get_db),
):
    try:
        return quote_service.update_quote(
            db,
            quote_id,
            quote,
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Devis introuvable",
        )


@router.delete("/{quote_id}")
def delete_quote(
    quote_id: int,
    db: Session = Depends(get_db),
):
    try:
        quote_service.delete_quote(
            db,
            quote_id,
        )

        return {
            "message": "Devis supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Devis introuvable",
        )