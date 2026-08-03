from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.schemas.service import (
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)
from app.services import service_service

router = APIRouter(
    prefix="/services",
    tags=["Services"],
)


@router.post("", response_model=ServiceResponse)
def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db)
):
    return service_service.create_service(
        db,
        service
    )


@router.get("", response_model=list[ServiceResponse])
def get_services(
    db: Session = Depends(get_db)
):
    return service_service.get_services(db)


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: int,
    db: Session = Depends(get_db)
):
    try:
        return service_service.get_service(
            db,
            service_id
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Service introuvable"
        )


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    service: ServiceUpdate,
    db: Session = Depends(get_db)
):
    try:
        return service_service.update_service(
            db,
            service_id,
            service
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Service introuvable"
        )


@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db)
):
    try:
        service_service.delete_service(
            db,
            service_id
        )

        return {
            "message": "Service supprimé."
        }

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Service introuvable"
        )