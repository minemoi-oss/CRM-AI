from fastapi import HTTPException, status

from app.models.user import User


def get_company_id(current_user: User) -> int:
    if current_user.company is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune entreprise n'est associée à cet utilisateur.",
        )
    return current_user.company.id


def ensure_company_access(resource_company_id: int | None, current_user: User) -> None:
    if resource_company_id != get_company_id(current_user):
        # A 404 avoids revealing that another company's resource exists.
        raise HTTPException(status_code=404, detail="Ressource introuvable.")
