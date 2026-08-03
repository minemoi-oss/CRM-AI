from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.dependencies import get_db
from app.repositories import user_repository

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Token invalide."
        )

    user_id = payload.get("sub")

    user = user_repository.get_by_id(
        db,
        int(user_id)
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Utilisateur introuvable."
        )

    return user