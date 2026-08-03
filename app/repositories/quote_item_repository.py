from sqlalchemy.orm import Session

from app.models.quote_item import QuoteItem


def create(db: Session, item: QuoteItem) -> QuoteItem:
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_by_id(db: Session, item_id: int) -> QuoteItem | None:
    return db.get(QuoteItem, item_id)


def get_all(db: Session) -> list[QuoteItem]:
    return db.query(QuoteItem).all()


def update(db: Session, item: QuoteItem) -> QuoteItem:
    db.commit()
    db.refresh(item)
    return item


def delete(db: Session, item: QuoteItem):
    db.delete(item)
    db.commit()