from sqlalchemy.orm import Session

from app.models.company import Company


def create(db: Session, company: Company) -> Company:
    db.add(company)
    db.commit()
    db.refresh(company)

    return company


def get_by_id(db: Session, company_id: int) -> Company | None:
    return db.get(Company, company_id)


def get_all(db: Session) -> list[Company]:
    return db.query(Company).all()


def update(db: Session, company: Company) -> Company:
    db.commit()
    db.refresh(company)

    return company


def delete(db: Session, company: Company) -> None:
    db.delete(company)
    db.commit()