from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse
)
from app.services import company_services

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post("", response_model=CompanyResponse)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db)
):
    return company_services.create_company(db, company)


@router.get("", response_model=list[CompanyResponse])
def get_companies(
    db: Session = Depends(get_db)
):
    return company_services.get_companies(db)


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    try:
        return company_services.get_company(db, company_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    company: CompanyUpdate,
    db: Session = Depends(get_db)
):
    try:
        return company_services.update_company(
            db,
            company_id,
            company
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    try:
        company_services.delete_company(db, company_id)

        return {
            "message": "Entreprise supprimée avec succès."
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))