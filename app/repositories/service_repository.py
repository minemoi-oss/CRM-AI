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
    service_id: int
) -> Service | None:
    return db.get(Service, service_id)


def get_all(
    db: Session
) -> list[Service]:
    return db.query(Service).all()


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
