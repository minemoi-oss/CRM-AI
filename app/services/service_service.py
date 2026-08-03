from sqlalchemy.orm import Session

from app.models.service import Service
from app.repositories import service_repository
from app.schemas.service import ServiceCreate, ServiceUpdate


def create_service(
    db: Session,
    service_data: ServiceCreate
) -> Service:

    service = Service(
        name=service_data.name,
        description=service_data.description,
        price=service_data.price,
    )

    return service_repository.create(
        db,
        service
    )


def get_service(
    db: Session,
    service_id: int
):

    service = service_repository.get_by_id(
        db,
        service_id
    )

    if service is None:
        raise ValueError("Service introuvable")

    return service


def get_services(
    db: Session
):

    return service_repository.get_all(db)


def update_service(
    db: Session,
    service_id: int,
    service_data: ServiceUpdate
):

    service = service_repository.get_by_id(
        db,
        service_id
    )

    if service is None:
        raise ValueError("Service introuvable")

    service.name = service_data.name
    service.description = service_data.description
    service.price = service_data.price

    return service_repository.update(
        db,
        service
    )


def delete_service(
    db: Session,
    service_id: int
):

    service = service_repository.get_by_id(
        db,
        service_id
    )

    if service is None:
        raise ValueError("Service introuvable")

    service_repository.delete(
        db,
        service
    )