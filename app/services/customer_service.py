from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.user import User

from app.repositories import customer_repositori
from app.schemas.customer import CustomerCreate, CustomerUpdate


# =========================================================
# CRÉER UN CLIENT
# =========================================================

def create_customer(
    db: Session,
    customer_data: CustomerCreate,
    current_user: User,
) -> Customer:

    if current_user.company is None:
        raise ValueError("L'utilisateur n'a pas d'entreprise")

    customer = Customer(
        first_name=customer_data.first_name,
        last_name=customer_data.last_name,
        email=customer_data.email,
        phone=customer_data.phone,
        company_id=current_user.company.id,
    )

    return customer_repositori.create(
        db,
        customer
    )


# =========================================================
# RÉCUPÉRER UN CLIENT
# =========================================================

def get_customer(
    db: Session,
    customer_id: int,
    current_user: User,
) -> Customer:

    if current_user.company is None:
        raise ValueError("L'utilisateur n'a pas d'entreprise")

    customer = customer_repositori.get_by_id(
        db,
        customer_id
    )

    if customer is None:
        raise ValueError("Customer introuvable")

    if customer.company_id != current_user.company.id:
        raise ValueError("Customer introuvable")

    return customer


# =========================================================
# RÉCUPÉRER LES CLIENTS
# =========================================================

def get_customers(
    db: Session,
    current_user: User,
    search: str | None = None,
    page: int = 1,
    size: int = 10,
    sort_by: str = "id",
    order: str = "asc",
):

    if current_user.company is None:
        raise ValueError("L'utilisateur n'a pas d'entreprise")

    company_id = current_user.company.id

    return customer_repositori.get_all(
        db=db,
        search=search,
        company_id=company_id,
        page=page,
        size=size,
        sort_by=sort_by,
        order=order,
    )


# =========================================================
# MODIFIER UN CLIENT
# =========================================================

def update_customer(
    db: Session,
    customer_id: int,
    customer_data: CustomerUpdate,
    current_user: User,
) -> Customer:

    if current_user.company is None:
        raise ValueError("L'utilisateur n'a pas d'entreprise")

    customer = customer_repositori.get_by_id(
        db,
        customer_id
    )

    if customer is None:
        raise ValueError("Customer introuvable")

    if customer.company_id != current_user.company.id:
        raise ValueError("Customer introuvable")

    customer.first_name = customer_data.first_name
    customer.last_name = customer_data.last_name
    customer.email = customer_data.email
    customer.phone = customer_data.phone

    # On NE permet pas à l'utilisateur
    # de changer l'entreprise du client.
    customer.company_id = current_user.company.id

    return customer_repositori.update(
        db,
        customer
    )


# =========================================================
# SUPPRIMER UN CLIENT
# =========================================================

def delete_customer(
    db: Session,
    customer_id: int,
    current_user: User,
) -> None:

    if current_user.company is None:
        raise ValueError("L'utilisateur n'a pas d'entreprise")

    customer = customer_repositori.get_by_id(
        db,
        customer_id
    )

    if customer is None:
        raise ValueError("Customer introuvable")

    if customer.company_id != current_user.company.id:
        raise ValueError("Customer introuvable")

    customer_repositori.delete(
        db,
        customer
    )