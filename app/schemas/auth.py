from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserResponse


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class SessionResponse(BaseModel):
    id: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


class SecurityEventResponse(BaseModel):
    id: int
    event_type: str
    ip_address: str | None
    user_agent: str | None
    details: dict | None
    success: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
