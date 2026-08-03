from sqlalchemy.orm import Session

from app.models.product import Product
from app.repositories import product_respositori
from app.schemas.product import ProductCreate, ProductUpdate


def create_product(
    db: Session,
    product_data: ProductCreate
) -> Product:

    product = Product(
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
    )

    return product_respositori.create(db, product)


def get_product(
    db: Session,
    product_id: int
) -> Product:

    product = product_respositori.get_by_id(
        db,
        product_id
    )

    if product is None:
        raise ValueError("Produit introuvable")

    return product


def get_products(
    db: Session
):

    return product_respositori.get_all(db)


def update_product(
    db: Session,
    product_id: int,
    product_data: ProductUpdate
):

    product = product_respositori.get_by_id(
        db,
        product_id
    )

    if product is None:
        raise ValueError("Produit introuvable")

    product.name = product_data.name
    product.description = product_data.description
    product.price = product_data.price

    return product_respositori.update(
        db,
        product
    )


def delete_product(
    db: Session,
    product_id: int
):

    product = product_respositori.get_by_id(
        db,
        product_id
    )

    if product is None:
        raise ValueError("Produit introuvable")

    product_respositori.delete(
        db,
        product
    )