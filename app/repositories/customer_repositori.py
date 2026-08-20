from sqlalchemy import or_, asc, desc, func
from sqlalchemy.orm import Session

from app.models.customer import Customer


def create(db: Session, customer: Customer) -> Customer:
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def get_by_id(db: Session, customer_id: int) -> Customer | None:
    return db.get(Customer, customer_id)


def get_by_email(db: Session, email: str, company_id: int) -> Customer | None:
    return (
        db.query(Customer)
        .filter(
            Customer.company_id == company_id,
            func.lower(func.trim(Customer.email)) == email.strip().lower(),
        )
        .first()
    )


def get_all(
    db: Session,
    search: str | None = None,
    company_id: int | None = None,
    page: int = 1,
    size: int = 10,
    sort_by: str = "id",
    order: str = "asc",
):

    query = db.query(Customer)

    # -----------------------------
    # Recherche
    # -----------------------------

    if search:
        query = query.filter(
            or_(
                Customer.first_name.ilike(f"%{search}%"),
                Customer.last_name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
            )
        )

    # -----------------------------
    # Filtre entreprise
    # -----------------------------

    if company_id:
        query = query.filter(
            Customer.company_id == company_id
        )

    # -----------------------------
    # Nombre total
    # -----------------------------

    total = query.count()

    # -----------------------------
    # Tri
    # -----------------------------

    column = getattr(
        Customer,
        sort_by,
        Customer.id
    )

    if order.lower() == "desc":

        query = query.order_by(
            desc(column)
        )

    else:

        query = query.order_by(
            asc(column)
        )

    # -----------------------------
    # Pagination
    # -----------------------------

    offset = (page - 1) * size

    query = query.offset(offset).limit(size)

    customers = query.all()

    return customers, total

def update(db: Session, customer: Customer) -> Customer:
    db.commit()
    db.refresh(customer)
    return customer


def delete(db: Session, customer: Customer) -> None:
    db.delete(customer)
    db.commit()
