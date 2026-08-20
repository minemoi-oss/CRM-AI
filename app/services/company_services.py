from sqlalchemy.orm import Session

from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.models.user import User
import app.repositories.repisotorie_company as company_repository

def create_company(
    db: Session,
    company_data: CompanyCreate,
    current_user: User,
) -> Company:

    if current_user.company is not None:
        raise ValueError("Cet utilisateur possède déjà une entreprise")

    company = Company(
        name=company_data.name,
        email=company_data.email,
        phone=company_data.phone,
        website=company_data.website,
        owner_id=current_user.id,
    )

    return company_repository.create(db, company)


def get_company(
    db: Session,
    current_user: User,
) -> Company:

    company = current_user.company

    if company is None:
        raise ValueError("Entreprise introuvable")

    return company


def update_company(
    db: Session,
    company_data: CompanyUpdate,
    current_user: User,
) -> Company:

    company = current_user.company

    if company is None:
        raise ValueError("Entreprise introuvable")

    company.name = company_data.name
    company.email = company_data.email
    company.phone = company_data.phone
    company.website = company_data.website

    return company_repository.update(db, company)


def delete_company(
    db: Session,
    current_user: User,
) -> None:

    company = current_user.company

    if company is None:
        raise ValueError("Entreprise introuvable")

    company_repository.delete(db, company)
