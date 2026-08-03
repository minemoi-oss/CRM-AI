from sqlalchemy.orm import Session

from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate
import app.repositories.repisotorie_company as company_repository

def create_company(
    db: Session,
    company_data: CompanyCreate
) -> Company:

    company = Company(
        name=company_data.name,
        email=company_data.email,
        phone=company_data.phone,
        website=company_data.website,
    )

    return company_repository.create(db, company)


def get_company(
    db: Session,
    company_id: int
) -> Company:

    company = company_repository.get_by_id(db, company_id)

    if company is None:
        raise ValueError("Entreprise introuvable")

    return company


def get_companies(db: Session) -> list[Company]:
    return company_repository.get_all(db)


def update_company(
    db: Session,
    company_id: int,
    company_data: CompanyUpdate
) -> Company:

    company = company_repository.get_by_id(db, company_id)

    if company is None:
        raise ValueError("Entreprise introuvable")

    company.name = company_data.name
    company.email = company_data.email
    company.phone = company_data.phone
    company.website = company_data.website

    return company_repository.update(db, company)


def delete_company(
    db: Session,
    company_id: int
) -> None:

    company = company_repository.get_by_id(db, company_id)

    if company is None:
        raise ValueError("Entreprise introuvable")

    company_repository.delete(db, company)