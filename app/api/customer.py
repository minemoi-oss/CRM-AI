from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.api.dependencies import get_current_user
from app.models.user import User

from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    CustomerListResponse,
)

from app.services import customer_service


router = APIRouter()


# =========================================================
# CRÉER UN CLIENT
# =========================================================

@router.post(
    "/customers",
    response_model=CustomerResponse
)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:
        return customer_service.create_customer(
            db,
            customer,
            current_user
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


# =========================================================
# LISTE DES CLIENTS
# =========================================================

@router.get(
    "/customers",
    response_model=CustomerListResponse
)
def get_customers(
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="id", pattern="^(id|first_name|last_name|email|created_at)$"),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:

        customers, total = customer_service.get_customers(
            db=db,
            current_user=current_user,
            search=search,
            page=page,
            size=size,
            sort_by=sort_by,
            order=order,
        )

        pages = (total + size - 1) // size

        return {
            "items": customers,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


# =========================================================
# DÉTAIL CLIENT
# =========================================================

@router.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:

        return customer_service.get_customer(
            db,
            customer_id,
            current_user
        )

    except ValueError:

        raise HTTPException(
            status_code=404,
            detail="Client introuvable"
        )


# =========================================================
# MODIFIER CLIENT
# =========================================================

@router.put(
    "/customers/{customer_id}",
    response_model=CustomerResponse
)
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:

        return customer_service.update_customer(
            db,
            customer_id,
            customer,
            current_user
        )

    except ValueError:

        raise HTTPException(
            status_code=404,
            detail="Client introuvable"
        )


# =========================================================
# SUPPRIMER CLIENT
# =========================================================

@router.delete(
    "/customers/{customer_id}"
)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:

        customer_service.delete_customer(
            db,
            customer_id,
            current_user
        )

        return {
            "status": "success",
            "message": "Client supprimé avec succès."
        }

    except ValueError:

        raise HTTPException(
            status_code=404,
            detail="Client introuvable"
        )
