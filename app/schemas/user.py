from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


def normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip().casefold()


def validate_password_bytes(value: str | None) -> str | None:
    if value is None:
        return None
    if len(value.encode("utf-8")) > 1024:
        raise ValueError("Le mot de passe ne peut pas dépasser 1024 octets.")
    return value


def normalize_username(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        raise ValueError("Le nom d'utilisateur est obligatoire.")
    return value


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=128)

    _normalize_email = field_validator("email", mode="before")(normalize_email)
    _normalize_username = field_validator("username", mode="before")(normalize_username)
    _validate_password = field_validator("password")(validate_password_bytes)


class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=1, max_length=128)

    _normalize_email = field_validator("email", mode="before")(normalize_email)
    _validate_password = field_validator("password")(validate_password_bytes)


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_active: bool
    email_verified: bool = False
    pending_email: EmailStr | None = None

    model_config = ConfigDict(from_attributes=True)


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse
    development_token: str | None = None


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=100)
    current_password: str | None = Field(default=None, min_length=1, max_length=128)

    _normalize_email = field_validator("email", mode="before")(normalize_email)
    _normalize_username = field_validator("username", mode="before")(normalize_username)
    _validate_current_password = field_validator("current_password")(validate_password_bytes)

    @model_validator(mode="after")
    def require_at_least_one_change(self):
        if self.username is None and self.email is None:
            raise ValueError("Au moins une modification est requise.")
        return self


class UserUpdateResponse(BaseModel):
    user: UserResponse
    message: str
    email_change_pending: bool
    development_token: str | None = None


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    _validate_current = field_validator("current_password")(validate_password_bytes)
    _validate_new = field_validator("new_password")(validate_password_bytes)


class PasswordChangeResponse(BaseModel):
    message: str


class EmailRequest(BaseModel):
    email: EmailStr = Field(max_length=100)

    _normalize_email = field_validator("email", mode="before")(normalize_email)


class TokenRequest(BaseModel):
    token: str = Field(min_length=20, max_length=500)


class PasswordReset(BaseModel):
    token: str = Field(min_length=20, max_length=500)
    new_password: str = Field(min_length=8, max_length=128)

    _validate_new = field_validator("new_password")(validate_password_bytes)


class MessageResponse(BaseModel):
    message: str
    development_token: str | None = None
