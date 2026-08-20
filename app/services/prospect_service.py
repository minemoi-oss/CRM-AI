from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.prospect import Prospect
from app.models.user import User
from app.repositories import customer_repositori, prospect_repository
from app.schemas.prospect import ProspectCreate, ProspectUpdate
from app.services.access import get_company_id


class ProspectNotFoundError(ValueError):
    pass


class ProspectConflictError(ValueError):
    pass


class ProspectValidationError(ValueError):
    pass


def _lock_conversion_email(db: Session, company_id: int, email: str) -> None:
    """Serialize same-company conversions for the same normalized e-mail on PostgreSQL."""
    if db.get_bind().dialect.name != "postgresql":
        return

    lock_identity = f"prospect-conversion:{company_id}:{email.strip().lower()}"
    db.execute(
        select(
            func.pg_advisory_xact_lock(
                func.hashtextextended(lock_identity, 0),
            )
        )
    )


def create_prospect(
    db: Session,
    prospect_data: ProspectCreate,
    current_user: User,
) -> Prospect:
    company_id = get_company_id(current_user)
    prospect = Prospect(
        first_name=prospect_data.first_name,
        last_name=prospect_data.last_name,
        email=str(prospect_data.email).lower(),
        phone=prospect_data.phone,
        organization=prospect_data.organization,
        notes=prospect_data.notes,
        status=prospect_data.status,
        priority=prospect_data.priority,
        company_id=company_id,
    )
    return prospect_repository.create(db, prospect)


def get_prospect(
    db: Session,
    prospect_id: int,
    current_user: User,
) -> Prospect:
    prospect = prospect_repository.get_by_id(
        db,
        prospect_id,
        get_company_id(current_user),
    )
    if prospect is None:
        raise ProspectNotFoundError("Prospect introuvable")
    return prospect


def get_prospects(
    db: Session,
    current_user: User,
    *,
    search: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    page: int = 1,
    size: int = 10,
    sort_by: str = "created_at",
    order: str = "desc",
) -> tuple[list[Prospect], int]:
    return prospect_repository.get_all(
        db,
        get_company_id(current_user),
        search=search,
        status=status,
        priority=priority,
        page=page,
        size=size,
        sort_by=sort_by,
        order=order,
    )


def update_prospect(
    db: Session,
    prospect_id: int,
    prospect_data: ProspectUpdate,
    current_user: User,
) -> Prospect:
    prospect = prospect_repository.get_by_id(
        db,
        prospect_id,
        get_company_id(current_user),
    )
    if prospect is None:
        raise ProspectNotFoundError("Prospect introuvable")
    if prospect.status == "converted":
        raise ProspectConflictError("Un prospect converti ne peut plus être modifié.")

    changes = prospect_data.model_dump(exclude_unset=True)
    required_fields = {"first_name", "last_name", "email", "phone", "status", "priority"}
    if any(changes.get(field) is None for field in required_fields & changes.keys()):
        raise ProspectValidationError("Les champs obligatoires ne peuvent pas être vides.")
    if "email" in changes:
        changes["email"] = str(changes["email"]).lower()

    for field, value in changes.items():
        setattr(prospect, field, value)

    return prospect_repository.update(db, prospect)


def delete_prospect(
    db: Session,
    prospect_id: int,
    current_user: User,
) -> None:
    prospect = prospect_repository.get_by_id(
        db,
        prospect_id,
        get_company_id(current_user),
    )
    if prospect is None:
        raise ProspectNotFoundError("Prospect introuvable")
    if prospect.status == "converted":
        raise ProspectConflictError(
            "Un prospect converti est conservé dans l'historique et ne peut pas être supprimé."
        )
    prospect_repository.delete(db, prospect)


def convert_prospect(
    db: Session,
    prospect_id: int,
    current_user: User,
) -> tuple[Prospect, Customer]:
    company_id = get_company_id(current_user)
    prospect = prospect_repository.get_by_id(
        db,
        prospect_id,
        company_id,
        for_update=True,
    )
    if prospect is None:
        raise ProspectNotFoundError("Prospect introuvable")
    if prospect.status == "converted" or prospect.customer_id is not None:
        db.rollback()
        raise ProspectConflictError("Ce prospect a déjà été converti en client.")

    _lock_conversion_email(db, company_id, prospect.email)
    existing_customer = customer_repositori.get_by_email(
        db,
        prospect.email,
        company_id,
    )
    if existing_customer is not None:
        db.rollback()
        raise ProspectConflictError(
            "Un client avec cette adresse e-mail existe déjà dans votre entreprise."
        )

    customer = Customer(
        first_name=prospect.first_name,
        last_name=prospect.last_name,
        email=prospect.email,
        phone=prospect.phone,
        company_id=company_id,
    )

    try:
        db.add(customer)
        db.flush()
        prospect.status = "converted"
        prospect.converted_at = datetime.now(timezone.utc)
        prospect.customer_id = customer.id
        db.commit()
        db.refresh(customer)
        db.refresh(prospect)
    except IntegrityError as error:
        db.rollback()
        raise ProspectConflictError("La conversion de ce prospect est déjà enregistrée.") from error
    except Exception:
        db.rollback()
        raise

    return prospect, customer
