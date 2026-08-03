from sqlalchemy.orm import Session

from app.models.product import Product


def create(
    db: Session,
    product: Product
) -> Product:
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_by_id(
    db: Session,
    product_id: int
) -> Product | None:
    return db.get(Product, product_id)


def get_all(
    db: Session
) -> list[Product]:
    return db.query(Product).all()


def update(
    db: Session,
    product: Product
) -> Product:
    db.commit()
    db.refresh(product)
    return product


def delete(
    db: Session,
    product: Product
):
    db.delete(product)
    db.commit()