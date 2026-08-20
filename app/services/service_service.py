from sqlalchemy.orm import Session

from app.models.service import Service
from app.repositories import service_repository
from app.schemas.service import ServiceCreate, ServiceUpdate
from app.models.user import User
from app.services.access import get_company_id


def create_service(
    db: Session,
    service_data: ServiceCreate,
    current_user: User,
) -> Service:

    service = Service(
        name=service_data.name,
        description=service_data.description,
        pricing_type=service_data.pricing_type,
        price=service_data.price,
        duration=service_data.duration,
        company_id=get_company_id(current_user),
    )

    return service_repository.create(
        db,
        service
    )


def get_service(
    db: Session,
    service_id: int,
    current_user: User,
):

    service = service_repository.get_by_id(
        db,
        service_id,
        get_company_id(current_user),
    )

    if service is None:
        raise ValueError("Service introuvable")

    return service


def get_services(
    db: Session,
    current_user: User,
):

    return service_repository.get_all(db, get_company_id(current_user))


def update_service(
    db: Session,
    service_id: int,
    service_data: ServiceUpdate,
    current_user: User,
):

    service = service_repository.get_by_id(
        db,
        service_id,
        get_company_id(current_user),
    )

    if service is None:
        raise ValueError("Service introuvable")

    service.name = service_data.name
    service.description = service_data.description
    service.pricing_type = service_data.pricing_type
    service.price = service_data.price
    service.duration = service_data.duration

    return service_repository.update(
        db,
        service
    )


def delete_service(
    db: Session,
    service_id: int,
    current_user: User,
):

    service = service_repository.get_by_id(
        db,
        service_id,
        get_company_id(current_user),
    )

    if service is None:
        raise ValueError("Service introuvable")

    if service.quote_items:
        raise ValueError("Ce service est utilisé dans un devis et ne peut pas être supprimé.")

    service_repository.delete(
        db,
        service
    )
