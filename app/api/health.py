from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.dependencies import get_db


router = APIRouter(prefix="/health", tags=["System"])


@router.get("/live")
def health_live():
    """Liveness probe: the API process is running."""
    return {"status": "ok"}


@router.get("/ready")
def health_ready(db: Session = Depends(get_db)):
    """Readiness probe: the API can reach PostgreSQL."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de données indisponible.",
        ) from error
    return {"status": "ok", "database": "ready"}


@router.get("/db", include_in_schema=False)
def health_db_legacy(db: Session = Depends(get_db)):
    """Backward-compatible alias kept for existing local checks."""
    return health_ready(db)
