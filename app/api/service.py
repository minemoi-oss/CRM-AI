from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.service import (
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)
from app.services import service_service
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/services",
    tags=["Services"],
)


@router.post("", response_model=ServiceResponse)
def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_service.create_service(
        db,
        service,
        current_user,
    )


@router.get("", response_model=list[ServiceResponse])
def get_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_service.get_services(db, current_user)


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service_service.get_service(
            db,
            service_id,
            current_user,
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Service introuvable",
        )


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    service: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service_service.update_service(
            db,
            service_id,
            service,
            current_user,
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Service introuvable",
        )


@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        service_service.delete_service(
            db,
            service_id,
            current_user,
        )

        return {
            "message": "Service supprimé."
        }

    except ValueError as error:
        raise HTTPException(
            status_code=409 if "utilisé" in str(error) else 404,
            detail=str(error),
        )
