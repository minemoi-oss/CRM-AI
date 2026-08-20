from sqlalchemy.orm import Session

from app.models.service import Service


def create(
    db: Session,
    service: Service
) -> Service:
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def get_by_id(
    db: Session,
    service_id: int,
    company_id: int,
) -> Service | None:
    return db.query(Service).filter(Service.id == service_id, Service.company_id == company_id).first()


def get_all(
    db: Session,
    company_id: int,
) -> list[Service]:
    return db.query(Service).filter(Service.company_id == company_id).all()


def update(
    db: Session,
    service: Service
) -> Service:
    db.commit()
    db.refresh(service)
    return service


def delete(
    db: Session,
    service: Service
):
    db.delete(service)
    db.commit()
