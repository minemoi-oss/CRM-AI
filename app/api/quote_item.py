from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.quote_item import (
    QuoteItemCreate,
    QuoteItemResponse,
)
from app.services import quote_item_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/quote-items",
    tags=["Quote Items"],
)


@router.post("", response_model=QuoteItemResponse)
def create_quote_item(
    item: QuoteItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return quote_item_service.create_quote_item(
            db,
            item,
            current_user,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )


@router.get("", response_model=list[QuoteItemResponse])
def get_quote_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return quote_item_service.get_quote_items(db, current_user)
