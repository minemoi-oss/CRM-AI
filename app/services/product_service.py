from sqlalchemy.orm import Session

from app.models.product import Product
from app.repositories import product_respositori
from app.schemas.product import ProductCreate, ProductUpdate
from app.models.user import User
from app.services.access import get_company_id


def create_product(
    db: Session,
    product_data: ProductCreate,
    current_user: User,
) -> Product:

    product = Product(
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        stock=product_data.stock,
        company_id=get_company_id(current_user),
    )

    return product_respositori.create(db, product)


def get_product(
    db: Session,
    product_id: int,
    current_user: User,
) -> Product:

    product = product_respositori.get_by_id(
        db,
        product_id,
        get_company_id(current_user),
    )

    if product is None:
        raise ValueError("Produit introuvable")

    return product


def get_products(
    db: Session,
    current_user: User,
):

    return product_respositori.get_all(db, get_company_id(current_user))


def update_product(
    db: Session,
    product_id: int,
    product_data: ProductUpdate,
    current_user: User,
):

    product = product_respositori.get_by_id(
        db,
        product_id,
        get_company_id(current_user),
    )

    if product is None:
        raise ValueError("Produit introuvable")

    product.name = product_data.name
    product.description = product_data.description
    product.price = product_data.price
    product.stock = product_data.stock

    return product_respositori.update(
        db,
        product
    )


def delete_product(
    db: Session,
    product_id: int,
    current_user: User,
):

    product = product_respositori.get_by_id(
        db,
        product_id,
        get_company_id(current_user),
    )

    if product is None:
        raise ValueError("Produit introuvable")

    product_respositori.delete(
        db,
        product
    )
