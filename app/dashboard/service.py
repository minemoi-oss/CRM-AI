from sqlalchemy.orm import Session

from app.models.customer import Customer
def get_total_clients(db: Session):
    return db.query(Customer).count()