from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories import customer_repositori
from app.schemas.customer import CustomerCreate, CustomerUpdate


def create_customer(
    db: Session,
    customer_data: CustomerCreate
) -> Customer:

    customer = Customer(
    first_name=customer_data.first_name,
    last_name=customer_data.last_name,
    email=customer_data.email,
    phone=customer_data.phone,
    company_id=customer_data.company_id,

    )
    return customer_repositori.create(db, customer)


def get_customer(
    db: Session,
    customer_id: int
) -> Customer:

    customer = customer_repositori.get_by_id(db, customer_id)

    if customer is None:
        raise ValueError("Customer introuvable")

    return customer


def get_customers(
    db: Session,
    search: str | None = None,
    company_id: int | None = None,
    page: int = 1,
    size: int = 10,
    sort_by: str = "id",
    order: str = "asc",
) -> list[Customer]:

    return customer_repositori.get_all(
        db=db,
        search=search,
        company_id=company_id,
        page=page,
        size=size,
        sort_by=sort_by,
        order=order,
    )


def update_customer(
    db: Session,
    customer_id: int,
    customer_data: CustomerUpdate
) -> Customer:

    customer = customer_repositori.get_by_id(db, customer_id)

    if customer is None:
        raise ValueError("Customer introuvable")

    customer.first_name = customer_data.first_name
    customer.last_name = customer_data.last_name
    customer.email = customer_data.email
    customer.phone = customer_data.phone
    customer.company = customer_data.company

    return customer_repositori.update(db, customer)


def delete_customer(
    db: Session,
    customer_id: int
) -> None:

    customer = customer_repositori.get_by_id(db, customer_id)

    if customer is None:
        raise ValueError("Customer introuvable")

    customer_repositori.delete(db, customer)