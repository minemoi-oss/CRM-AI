from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services import product_service

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.post("", response_model=ProductResponse)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    return product_service.create_product(
        db,
        product
    )


@router.get("", response_model=list[ProductResponse])
def get_products(
    db: Session = Depends(get_db)
):
    return product_service.get_products(db)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        return product_service.get_product(
            db,
            product_id
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
    db: Session = Depends(get_db)
):
    try:
        return product_service.update_product(
            db,
            product_id,
            product
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Produit introuvable"
        )


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        product_service.delete_product(
            db,
            product_id
        )

        return {
            "message": "Produit supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Produit introuvable"
        )