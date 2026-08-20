from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse
)
from app.services import company_services
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post("", response_model=CompanyResponse)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return company_services.create_company(db, company, current_user)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))


@router.get("/me", response_model=CompanyResponse)
def get_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return company_services.get_company(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/me", response_model=CompanyResponse)
def update_company(
    company: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return company_services.update_company(
            db,
            company,
            current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/me")
def delete_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        company_services.delete_company(db, current_user)

        return {
            "message": "Entreprise supprimée avec succès."
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
