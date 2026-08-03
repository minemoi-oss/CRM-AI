from sqlalchemy.orm import Session

from app.models.quote import Quote


def create(db: Session, quote: Quote) -> Quote:
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def get_by_id(db: Session, quote_id: int) -> Quote | None:
    return db.get(Quote, quote_id)


def get_all(db: Session) -> list[Quote]:
    return db.query(Quote).all()


def update(db: Session, quote: Quote) -> Quote:
    db.commit()
    db.refresh(quote)
    return quote


def delete(db: Session, quote: Quote):
    db.delete(quote)
    db.commit()