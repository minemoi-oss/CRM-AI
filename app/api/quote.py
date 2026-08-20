from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.quote import (
    QuoteCreate,
    QuoteCreateWithItems,
    QuoteUpdate,
    QuoteResponse,
)
from app.services import quote_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/quotes",
    tags=["Quotes"],
)


@router.post("", response_model=QuoteResponse)
def create_quote(
    quote: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return quote_service.create_quote(db, quote, current_user)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("/with-items", response_model=QuoteResponse)
def create_quote_with_items(
    quote: QuoteCreateWithItems,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return quote_service.create_quote_with_items(db, quote, current_user)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("", response_model=list[QuoteResponse])
def get_quotes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return quote_service.get_quotes(db, current_user)


@router.get("/{quote_id}", response_model=QuoteResponse)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return quote_service.get_quote(
            db,
            quote_id,
            current_user,
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
    current_user: User = Depends(get_current_user),
):
    try:
        return quote_service.update_quote(
            db,
            quote_id,
            quote,
            current_user,
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
    current_user: User = Depends(get_current_user),
):
    try:
        quote_service.delete_quote(
            db,
            quote_id,
            current_user,
        )

        return {
            "message": "Devis supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Devis introuvable",
        )
