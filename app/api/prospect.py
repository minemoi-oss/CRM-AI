from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.models.user import User
from app.schemas.prospect import (
    ProspectConversionResponse,
    ProspectCreate,
    ProspectListResponse,
    ProspectPriority,
    ProspectResponse,
    ProspectStatus,
    ProspectUpdate,
)
from app.services import prospect_service


router = APIRouter(prefix="/prospects", tags=["Prospects"])


@router.post("", response_model=ProspectResponse, status_code=http_status.HTTP_201_CREATED)
def create_prospect(
    prospect: ProspectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return prospect_service.create_prospect(db, prospect, current_user)


@router.get("", response_model=ProspectListResponse)
def get_prospects(
    search: str | None = Query(default=None, max_length=100),
    status: ProspectStatus | None = None,
    priority: ProspectPriority | None = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(
        default="created_at",
        pattern="^(id|first_name|last_name|email|organization|status|priority|created_at|updated_at)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prospects, total = prospect_service.get_prospects(
        db,
        current_user,
        search=search,
        status=status,
        priority=priority,
        page=page,
        size=size,
        sort_by=sort_by,
        order=order,
    )
    return {
        "items": prospects,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.get(
    "/{prospect_id}",
    response_model=ProspectResponse,
    responses={404: {"description": "Prospect introuvable"}},
)
def get_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return prospect_service.get_prospect(db, prospect_id, current_user)
    except prospect_service.ProspectNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put(
    "/{prospect_id}",
    response_model=ProspectResponse,
    responses={
        404: {"description": "Prospect introuvable"},
        409: {"description": "Le prospect est déjà converti"},
    },
)
def update_prospect(
    prospect_id: int,
    prospect: ProspectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return prospect_service.update_prospect(db, prospect_id, prospect, current_user)
    except prospect_service.ProspectNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except prospect_service.ProspectConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except prospect_service.ProspectValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete(
    "/{prospect_id}",
    responses={
        404: {"description": "Prospect introuvable"},
        409: {"description": "Le prospect est déjà converti"},
    },
)
def delete_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        prospect_service.delete_prospect(db, prospect_id, current_user)
        return {"message": "Prospect supprimé."}
    except prospect_service.ProspectNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except prospect_service.ProspectConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.post(
    "/{prospect_id}/convert",
    response_model=ProspectConversionResponse,
    responses={
        404: {"description": "Prospect introuvable"},
        409: {"description": "Prospect déjà converti ou client e-mail déjà existant"},
    },
)
def convert_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        prospect, customer = prospect_service.convert_prospect(db, prospect_id, current_user)
        return {"prospect": prospect, "customer": customer}
    except prospect_service.ProspectNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except prospect_service.ProspectConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
