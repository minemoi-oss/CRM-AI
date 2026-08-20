from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.models.prospect import Prospect


SORTABLE_COLUMNS = {
    "id": Prospect.id,
    "first_name": Prospect.first_name,
    "last_name": Prospect.last_name,
    "email": Prospect.email,
    "organization": Prospect.organization,
    "status": Prospect.status,
    "priority": Prospect.priority,
    "created_at": Prospect.created_at,
    "updated_at": Prospect.updated_at,
}


def create(db: Session, prospect: Prospect) -> Prospect:
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect


def get_by_id(
    db: Session,
    prospect_id: int,
    company_id: int,
    *,
    for_update: bool = False,
) -> Prospect | None:
    query = db.query(Prospect).filter(
        Prospect.id == prospect_id,
        Prospect.company_id == company_id,
    )
    if for_update:
        query = query.with_for_update()
    return query.first()


def get_all(
    db: Session,
    company_id: int,
    *,
    search: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    page: int = 1,
    size: int = 10,
    sort_by: str = "created_at",
    order: str = "desc",
) -> tuple[list[Prospect], int]:
    query = db.query(Prospect).filter(Prospect.company_id == company_id)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Prospect.first_name.ilike(term),
                Prospect.last_name.ilike(term),
                Prospect.email.ilike(term),
                Prospect.phone.ilike(term),
                Prospect.organization.ilike(term),
            )
        )
    if status:
        query = query.filter(Prospect.status == status)
    if priority:
        query = query.filter(Prospect.priority == priority)

    total = query.count()
    column = SORTABLE_COLUMNS.get(sort_by, Prospect.created_at)
    direction = desc if order == "desc" else asc
    query = query.order_by(direction(column))
    if column is not Prospect.id:
        query = query.order_by(direction(Prospect.id))
    items = query.offset((page - 1) * size).limit(size).all()
    return items, total


def update(db: Session, prospect: Prospect) -> Prospect:
    db.commit()
    db.refresh(prospect)
    return prospect


def delete(db: Session, prospect: Prospect) -> None:
    db.delete(prospect)
    db.commit()
