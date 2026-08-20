from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import AuthContext, get_auth_context, get_current_user
from app.database.dependencies import get_db
from app.models.user import User
from app.schemas.ai import (
    AIAskRequest,
    AIAskResponse,
    AICustomerSearchResponse,
    AICustomerSummaryRequest,
    AICustomerSummaryResponse,
    AIEmailDraftRequest,
    AIEmailDraftResponse,
    AIStatusResponse,
    CopilotHistoryResponse,
    CopilotProposalConfirmationResponse,
    CopilotRequest,
    CopilotResponse,
)
from app.services import ai_copilot, ai_service
from app.services.ai_memory import CopilotProposalNotFoundError
from app.services.ai_providers import AIProviderError, AIProviderUnavailableError


router = APIRouter(prefix="/ai", tags=["AI"])


def _translate_ai_error(error: Exception) -> HTTPException:
    if isinstance(error, ai_service.AIQuotaExceededError):
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(error),
            headers={"Retry-After": str(error.retry_after_seconds)},
        )
    if isinstance(error, ai_service.AIResourceNotFoundError):
        return HTTPException(status_code=404, detail="Client introuvable.")
    if isinstance(error, ai_service.AIInputValidationError):
        return HTTPException(status_code=422, detail=str(error))
    if isinstance(error, ai_service.AIServiceDisabledError):
        return HTTPException(status_code=503, detail=str(error))
    if isinstance(error, AIProviderUnavailableError):
        return HTTPException(status_code=503, detail=str(error))
    if isinstance(error, AIProviderError):
        return HTTPException(status_code=502, detail=str(error))
    return HTTPException(status_code=500, detail="Erreur interne du module IA.")


@router.get("/status", response_model=AIStatusResponse)
def get_ai_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ai_service.get_status(db, current_user)


@router.get("/customers/search", response_model=AICustomerSearchResponse)
def search_ai_customers(
    q: str = Query(min_length=2, max_length=100),
    limit: int = Query(default=10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ai_service.search_customers(db, current_user, q, limit=limit)
    except ai_service.AIInputValidationError as error:
        raise _translate_ai_error(error) from error


@router.post("/ask", response_model=AIAskResponse)
def ask_ai(
    payload: AIAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ai_service.ask_question(db, current_user, payload.question)
    except (
        ai_service.AIQuotaExceededError,
        ai_service.AIResourceNotFoundError,
        ai_service.AIInputValidationError,
        ai_service.AIServiceDisabledError,
        AIProviderError,
    ) as error:
        raise _translate_ai_error(error) from error


@router.post("/email-drafts", response_model=AIEmailDraftResponse)
def create_ai_email_draft(
    payload: AIEmailDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ai_service.create_email_draft(
            db,
            current_user,
            customer_id=payload.customer_id,
            objective=payload.objective,
            tone=payload.tone,
            language=payload.language,
        )
    except (
        ai_service.AIQuotaExceededError,
        ai_service.AIResourceNotFoundError,
        ai_service.AIInputValidationError,
        ai_service.AIServiceDisabledError,
        AIProviderError,
    ) as error:
        raise _translate_ai_error(error) from error


@router.post(
    "/customers/{customer_id}/summary",
    response_model=AICustomerSummaryResponse,
)
def summarize_ai_customer(
    customer_id: int,
    payload: AICustomerSummaryRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ai_service.summarize_customer(
            db,
            current_user,
            customer_id=customer_id,
            focus=payload.focus if payload else None,
        )
    except (
        ai_service.AIQuotaExceededError,
        ai_service.AIResourceNotFoundError,
        ai_service.AIInputValidationError,
        ai_service.AIServiceDisabledError,
        AIProviderError,
    ) as error:
        raise _translate_ai_error(error) from error


@router.post("/copilot", response_model=CopilotResponse)
def use_copilot(
    payload: CopilotRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(get_auth_context),
):
    try:
        return ai_copilot.copilot(
            db,
            auth.user,
            session_id=auth.session.id,
            page=payload.page,
            question=payload.question,
            active_entity=(
                payload.active_entity.model_dump()
                if payload.active_entity is not None
                else None
            ),
        )
    except ai_copilot.CopilotResourceNotFoundError as error:
        raise HTTPException(status_code=404, detail="Ressource introuvable.") from error
    except (
        ai_service.AIQuotaExceededError,
        ai_service.AIInputValidationError,
        ai_service.AIServiceDisabledError,
        AIProviderError,
    ) as error:
        raise _translate_ai_error(error) from error


@router.get("/copilot/history", response_model=CopilotHistoryResponse)
def get_copilot_history(auth: AuthContext = Depends(get_auth_context)):
    return ai_copilot.history(auth.session.id)


@router.delete("/copilot/history", response_model=CopilotHistoryResponse)
def clear_copilot_history(auth: AuthContext = Depends(get_auth_context)):
    return ai_copilot.clear_history(auth.session.id)


@router.post(
    "/copilot/proposals/{proposal_id}/confirm",
    response_model=CopilotProposalConfirmationResponse,
)
def confirm_copilot_proposal(
    proposal_id: str,
    auth: AuthContext = Depends(get_auth_context),
):
    try:
        return ai_copilot.confirm_proposal(auth.session.id, proposal_id)
    except CopilotProposalNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail="Proposition introuvable ou expirée.",
        ) from error
