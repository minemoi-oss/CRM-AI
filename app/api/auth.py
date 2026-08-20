from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.dependencies import AuthContext, get_auth_context, get_current_user
from app.core.config import settings
from app.core.security import constant_time_equal
from app.database.dependencies import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginResponse,
    RefreshResponse,
    SecurityEventResponse,
    SessionResponse,
)
from app.schemas.user import (
    EmailRequest,
    MessageResponse,
    PasswordChange,
    PasswordChangeResponse,
    PasswordReset,
    RegisterResponse,
    TokenRequest,
    UserCreate,
    UserResponse,
    UserUpdate,
    UserUpdateResponse,
)
from app.services import auth_service, email_service


REFRESH_COOKIE = "mine_crm_refresh"
CSRF_COOKIE = "mine_crm_csrf"
CSRF_HEADER = "X-CSRF-Token"

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _client_ip(request: Request) -> str:
    # Never parse forwarding headers here. Uvicorn rewrites request.client only
    # when the direct peer belongs to UVICORN_FORWARDED_ALLOW_IPS; reading the
    # header ourselves would let any client spoof its address and bypass the
    # IP-based authentication rate limit.
    return (request.client.host if request.client else "unknown")[:64]


def _user_agent(request: Request) -> str | None:
    value = request.headers.get("user-agent")
    return value[:500] if value else None


def _set_session_cookies(response: Response, refresh_token: str, csrf_token: str) -> None:
    max_age = settings.AUTH_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    common = {
        "secure": settings.auth_cookie_secure,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "max_age": max_age,
    }
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        httponly=True,
        path="/auth",
        domain=settings.AUTH_COOKIE_DOMAIN,
        **common,
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        httponly=False,
        path="/",
        domain=settings.auth_csrf_cookie_domain,
        **common,
    )


def _clear_session_cookies(response: Response) -> None:
    response.delete_cookie(
        REFRESH_COOKIE,
        path="/auth",
        domain=settings.AUTH_COOKIE_DOMAIN,
        secure=settings.auth_cookie_secure,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        CSRF_COOKIE,
        path="/",
        domain=settings.auth_csrf_cookie_domain,
        secure=settings.auth_cookie_secure,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


def _validate_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in settings.auth_allowed_origins:
        raise HTTPException(status_code=403, detail="Origine non autorisée.")


def _csrf_from_request(request: Request) -> str:
    _validate_origin(request)
    cookie_value = request.cookies.get(CSRF_COOKIE)
    header_value = request.headers.get(CSRF_HEADER)
    if not cookie_value or not header_value or not constant_time_equal(cookie_value, header_value):
        raise HTTPException(status_code=403, detail="Protection CSRF invalide.")
    return cookie_value


def _auth_error_headers(error: auth_service.AuthServiceError) -> dict[str, str]:
    headers: dict[str, str] = {}
    if isinstance(error, auth_service.RateLimitedError):
        headers = {"Retry-After": str(error.retry_after)}
    elif isinstance(error, auth_service.InvalidCredentialsError):
        headers = {"WWW-Authenticate": "Bearer"}
    return headers


def _raise_auth_error(error: auth_service.AuthServiceError) -> None:
    headers = _auth_error_headers(error)
    raise HTTPException(status_code=error.status_code, detail=str(error), headers=headers)


def _cleared_auth_error_response(
    status_code: int,
    detail: str,
    *,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    response = JSONResponse(
        status_code=status_code,
        content={"detail": detail},
        headers=headers,
    )
    _clear_session_cookies(response)
    return response


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        user, development_token = auth_service.register_user(
            db,
            data,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    except email_service.EmailDeliveryError as error:
        raise HTTPException(status_code=503, detail=str(error))
    return RegisterResponse(
        message="Compte créé. Consultez votre email pour l'activer.",
        user=user,
        development_token=development_token,
    )


@router.post("/login", response_model=LoginResponse)
def login(
    response: Response,
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    try:
        issued = auth_service.authenticate(
            db,
            form_data.username,
            form_data.password,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    _set_session_cookies(response, issued.refresh_token, issued.csrf_token)
    return LoginResponse(
        access_token=issued.access_token,
        expires_in=settings.AUTH_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=issued.user,
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    csrf_token = _csrf_from_request(request)
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        return _cleared_auth_error_response(
            401,
            "Session absente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        refreshed = auth_service.refresh_session(
            db,
            refresh_token,
            csrf_token,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        return _cleared_auth_error_response(
            error.status_code,
            str(error),
            headers=_auth_error_headers(error),
        )
    _set_session_cookies(response, refreshed.refresh_token, refreshed.csrf_token)
    return RefreshResponse(
        access_token=refreshed.access_token,
        expires_in=settings.AUTH_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        csrf_token = _csrf_from_request(request)
        try:
            auth_service.revoke_session_from_refresh(
                db,
                refresh_token,
                csrf_token,
                ip_address=_client_ip(request),
                user_agent=_user_agent(request),
            )
        except auth_service.AuthServiceError as error:
            return _cleared_auth_error_response(
                error.status_code,
                str(error),
                headers=_auth_error_headers(error),
            )
    _clear_session_cookies(response)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    request: Request,
    response: Response,
    context: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
) -> None:
    auth_service.revoke_all_sessions(db, context.user.id, "logout_all")
    auth_service.log_security_event(
        db,
        "logout_all",
        user_id=context.user.id,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    db.commit()
    _clear_session_cookies(response)


@router.post("/logout-current", status_code=status.HTTP_204_NO_CONTENT)
def logout_current(
    response: Response,
    context: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
) -> None:
    auth_service.revoke_owned_session(db, context.user.id, context.session.id)
    _clear_session_cookies(response)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserUpdateResponse)
def update_me(
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        user, development_token = auth_service.update_profile(
            db,
            current_user,
            data,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
        email_change_pending = bool(user.pending_email)
        return UserUpdateResponse(
            user=user,
            message=(
                "Un lien de confirmation a été envoyé à la nouvelle adresse email."
                if email_change_pending
                else "Informations personnelles enregistrées."
            ),
            email_change_pending=email_change_pending,
            development_token=development_token,
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    except email_service.EmailDeliveryError as error:
        raise HTTPException(status_code=503, detail=str(error))


@router.put("/me/password", response_model=PasswordChangeResponse)
def change_my_password(
    data: PasswordChange,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        auth_service.change_password(
            db,
            current_user,
            data,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    _clear_session_cookies(response)
    return PasswordChangeResponse(
        message="Mot de passe modifié. Tous les appareils ont été déconnectés."
    )


@router.post("/email/verification/request", response_model=MessageResponse, status_code=202)
def request_verification(
    data: EmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        token = auth_service.request_email_verification(
            db,
            str(data.email),
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    except email_service.EmailDeliveryError as error:
        raise HTTPException(status_code=503, detail=str(error))
    return MessageResponse(
        message="Si ce compte existe et doit être vérifié, un email a été envoyé.",
        development_token=token,
    )


@router.post("/email/verify", response_model=MessageResponse)
def verify_email(
    data: TokenRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        auth_service.verify_email_token(
            db,
            data.token,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return MessageResponse(message="Adresse email vérifiée.")


@router.post("/password/forgot", response_model=MessageResponse, status_code=202)
def forgot_password(
    data: EmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        token = auth_service.request_password_reset(
            db,
            str(data.email),
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    except email_service.EmailDeliveryError as error:
        raise HTTPException(status_code=503, detail=str(error))
    return MessageResponse(
        message="Si ce compte existe, un email de réinitialisation a été envoyé.",
        development_token=token,
    )


@router.post("/password/reset", response_model=MessageResponse)
def reset_password(
    data: PasswordReset,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        auth_service.reset_password(
            db,
            data,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    _clear_session_cookies(response)
    return MessageResponse(message="Mot de passe réinitialisé. Vous pouvez vous reconnecter.")


@router.get("/sessions", response_model=list[SessionResponse])
def sessions(
    context: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    return [
        SessionResponse(
            id=item.id,
            ip_address=item.ip_address,
            user_agent=item.user_agent,
            created_at=item.created_at,
            last_used_at=item.last_used_at,
            expires_at=item.expires_at,
            is_current=item.id == context.session.id,
        )
        for item in auth_service.list_sessions(db, context.user.id)
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: str,
    response: Response,
    context: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
) -> None:
    if not auth_service.revoke_owned_session(db, context.user.id, session_id):
        raise HTTPException(status_code=404, detail="Session introuvable.")
    if session_id == context.session.id:
        _clear_session_cookies(response)


@router.get("/security-events", response_model=list[SecurityEventResponse])
def security_events(
    limit: int = Query(default=50, ge=1, le=100),
    context: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    return auth_service.list_security_events(db, context.user.id, limit)
