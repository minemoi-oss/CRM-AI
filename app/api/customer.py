from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.services import customer_service

router = APIRouter()


@router.post("/customers", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db)
):
    return customer_service.create_customer(db, customer)


@router.get("/customers", response_model=list[CustomerResponse])
def get_customers(
    search: str | None = None,
    company_id: int | None = None,
    page: int = 1,
    size: int = 10,
    sort_by: str = "id",
    order: str = "asc",
    db: Session = Depends(get_db),
):
    return customer_service.get_customers(
        db=db,
        search=search,
        company_id=company_id,
        page=page,
        size=size,
        sort_by=sort_by,
        order=order,
    )


@router.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    try:
        return customer_service.get_customer(db, customer_id)

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Client introuvable"
        )


@router.put(
    "/customers/{customer_id}",
    response_model=CustomerResponse
)
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(get_db)
):
    try:
        return customer_service.update_customer(
            db,
            customer_id,
            customer
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Client introuvable"
        )


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    try:
        customer_service.delete_customer(
            db,
            customer_id
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