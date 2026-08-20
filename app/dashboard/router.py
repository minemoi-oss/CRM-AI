from enum import IntEnum

from fastapi import APIRouter, Query
from sqlalchemy.orm import Session
from fastapi import Depends

from app.database.dependencies import get_db
from app.dashboard.service import get_dashboard, get_report
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


class DashboardMonths(IntEnum):
    SIX = 6
    TWELVE = 12


@router.get("/")
def dashboard(
    months: DashboardMonths = Query(default=DashboardMonths.SIX),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company is None:
        return {"total_clients": 0, "monthly_revenue": 0, "pending_invoices": 0, "conversion_rate": 0, "monthly_revenues": [], "recent_clients": [], "recent_activities": []}
    return get_dashboard(db, current_user.company.id, months=int(months))


@router.get("/reports")
def reports(
    months: DashboardMonths = Query(default=DashboardMonths.SIX),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company is None:
        return {"total_invoiced": 0, "total_paid": 0, "outstanding": 0, "invoice_count": 0, "client_count": 0, "conversion_rate": 0, "monthly_revenues": []}
    return get_report(db, current_user.company.id, months=int(months))
