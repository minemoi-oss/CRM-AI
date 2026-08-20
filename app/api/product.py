from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services import product_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.post("", response_model=ProductResponse)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.create_product(
        db,
        product,
        current_user,
    )


@router.get("", response_model=list[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.get_products(db, current_user)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return product_service.get_product(
            db,
            product_id,
            current_user,
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Produit introuvable"
        )


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return product_service.update_product(
            db,
            product_id,
            product,
            current_user,
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Produit introuvable"
        )


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        product_service.delete_product(
            db,
            product_id,
            current_user,
        )

        return {
            "message": "Produit supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Produit introuvable"
        )
