# On importe BaseSettings qui permet de créer une classe
# capable de lire automatiquement les variables d'environnement.
#
# On importe aussi SettingsConfigDict qui sert à configurer
# le comportement de BaseSettings.
from typing import Literal
from urllib.parse import parse_qs, urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# On crée une classe Settings qui hérite de BaseSettings.
#
# Grâce à cet héritage, cette classe va automatiquement
# aller chercher les valeurs dans le fichier .env.
class Settings(BaseSettings):

    # Managed PostgreSQL providers normally expose a complete connection URL.
    # Local development can keep using the individual DB_* variables below.
    DATABASE_URL: SecretStr | None = None

    # Variable attendue dans le .env
    # Exemple :
    # DB_NAME=mydatabase
    DB_NAME: str | None = None

    # Nom d'utilisateur de la base de données
    # Exemple :
    # DB_USER=postgres
    DB_USER: str | None = None

    # Mot de passe de la base de données
    # Exemple :
    # DB_PASSWORD=123456
    DB_PASSWORD: SecretStr | None = None

    # Adresse du serveur de base de données
    # Exemple :
    # DB_HOST=localhost
    DB_HOST: str | None = None

    # Port de connexion
    # Exemple :
    # DB_PORT=5432
    DB_PORT: int = 5432
    DB_SSLMODE: Literal["disable", "allow", "prefer", "require", "verify-ca", "verify-full"] = "prefer"
    DB_POOL_SIZE: int = Field(default=5, ge=1, le=50)
    DB_MAX_OVERFLOW: int = Field(default=5, ge=0, le=100)
    DB_POOL_TIMEOUT_SECONDS: int = Field(default=30, ge=5, le=120)
    DB_POOL_RECYCLE_SECONDS: int = Field(default=300, ge=30, le=3600)

    # Clé secrète utilisée pour signer les JWT
    SECRET_KEY: str

    # Algorithme utilisé pour signer le token
    # Exemple :
    # ALGORITHM=HS256
    ALGORITHM: Literal["HS256"]

    # Durée de vie du token en minutes
    # Exemple :
    # ACCESS_TOKEN_EXPIRE_MINUTES=30
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Authentication settings. Defaults are convenient for local development;
    # production enables secure cookies automatically.
    APP_ENV: Literal["development", "test", "production"] = "development"
    AUTH_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10
    AUTH_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    AUTH_JWT_ISSUER: str = "mine-crm-ai"
    AUTH_JWT_AUDIENCE: str = "mine-crm-ai-api"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    AUTH_COOKIE_DOMAIN: str | None = None
    AUTH_CSRF_COOKIE_DOMAIN: str | None = None
    # Explicit local escape hatch for testing email flows without SMTP.
    # Production validation below always rejects it when enabled.
    AUTH_DEV_EXPOSE_TOKENS: bool = False
    AUTH_ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    BACKEND_TRUSTED_HOSTS: str = "localhost,127.0.0.1"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_USE_TLS: bool = True

    # AI is deliberately useful without an external API. Switching to OpenAI
    # is explicit and the secret is read by the backend only.
    AI_ENABLED: bool = True
    AI_PROVIDER: Literal["local", "openai"] = "local"
    OPENAI_API_KEY: SecretStr | None = None
    OPENAI_MODEL: str = "gpt-5.6-luna"
    AI_DAILY_REQUEST_LIMIT: int = Field(default=50, ge=1, le=10_000)
    AI_MONTHLY_BUDGET_MICROUSD: int = Field(
        default=5_000_000,
        ge=1,
        le=10_000_000_000,
    )
    AI_MAX_INPUT_CHARS: int = Field(default=4_000, ge=100, le=20_000)
    AI_MAX_CONTEXT_CHARS: int = Field(default=12_000, ge=1_000, le=100_000)
    AI_MAX_OUTPUT_TOKENS: int = Field(default=700, ge=64, le=4_000)
    AI_OPENAI_TIMEOUT_SECONDS: int = Field(default=30, ge=5, le=120)
    AI_COPILOT_MEMORY_TTL_MINUTES: int = Field(default=30, ge=5, le=240)
    AI_COPILOT_MAX_TURNS: int = Field(default=8, ge=1, le=20)
    AI_COPILOT_MAX_SESSIONS: int = Field(default=5_000, ge=100, le=100_000)
    AI_COPILOT_MEMORY_MESSAGE_CHARS: int = Field(default=2_000, ge=200, le=10_000)
    # Configurable price estimates for OPENAI_MODEL. Values are
    # micro-US-dollars per one million tokens and must be updated when the
    # configured model or its public pricing changes.
    AI_INPUT_COST_PER_MILLION_MICROUSD: int = Field(
        default=200_000,
        ge=0,
        le=10_000_000_000,
    )
    AI_OUTPUT_COST_PER_MILLION_MICROUSD: int = Field(
        default=1_200_000,
        ge=0,
        le=10_000_000_000,
    )

    # Configuration de BaseSettings.
    #
    # Ici on indique où trouver les variables d'environnement.
    model_config = SettingsConfigDict(

        # Nom du fichier contenant les variables.
        env_file=".env",

        # Encodage du fichier.
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def auth_cookie_secure(self) -> bool:
        return self.AUTH_COOKIE_SECURE or self.APP_ENV == "production"

    @property
    def auth_allowed_origins(self) -> set[str]:
        configured = {
            origin.strip().rstrip("/")
            for origin in self.AUTH_ALLOWED_ORIGINS.split(",")
            if origin.strip()
        }
        configured.add(self.FRONTEND_URL.rstrip("/"))
        return configured

    @property
    def auth_csrf_cookie_domain(self) -> str | None:
        return self.AUTH_CSRF_COOKIE_DOMAIN or self.AUTH_COOKIE_DOMAIN

    @property
    def backend_trusted_hosts(self) -> list[str]:
        hosts = [host.strip() for host in self.BACKEND_TRUSTED_HOSTS.split(",") if host.strip()]
        backend_host = urlsplit(self.BACKEND_URL).hostname
        if backend_host and backend_host not in hosts:
            hosts.append(backend_host)
        return hosts

    @model_validator(mode="after")
    def validate_auth_production_settings(self):
        database_url = (
            self.DATABASE_URL.get_secret_value().strip()
            if self.DATABASE_URL is not None
            else ""
        )
        individual_database_values = (
            self.DB_NAME,
            self.DB_USER,
            self.DB_PASSWORD.get_secret_value() if self.DB_PASSWORD is not None else None,
            self.DB_HOST,
        )
        if not database_url and not all(individual_database_values):
            raise ValueError(
                "Configurez DATABASE_URL ou toutes les variables DB_NAME, DB_USER, "
                "DB_PASSWORD et DB_HOST."
            )
        if self.AUTH_COOKIE_SAMESITE == "none" and not self.auth_cookie_secure:
            raise ValueError("SameSite=None exige des cookies Secure.")
        if self.APP_ENV == "production":
            normalized_secret = self.SECRET_KEY.strip().casefold()
            unsafe_secret_markers = (
                "change_moi",
                "change-me",
                "changeme",
                "replace-with",
                "your-secret",
                "example",
            )
            if (
                len(self.SECRET_KEY.encode("utf-8")) < 32
                or any(marker in normalized_secret for marker in unsafe_secret_markers)
            ):
                raise ValueError("SECRET_KEY doit contenir au moins 32 octets aléatoires en production.")
            if self.AUTH_DEV_EXPOSE_TOKENS:
                raise ValueError("AUTH_DEV_EXPOSE_TOKENS est interdit en production.")
            if not self.FRONTEND_URL.casefold().startswith("https://"):
                raise ValueError("FRONTEND_URL doit utiliser HTTPS en production.")
            if not self.BACKEND_URL.casefold().startswith("https://"):
                raise ValueError("BACKEND_URL doit utiliser HTTPS en production.")
            if any(
                not origin.casefold().startswith("https://")
                for origin in self.auth_allowed_origins
            ):
                raise ValueError("Toutes les origines autorisées doivent utiliser HTTPS en production.")
            if not self.SMTP_HOST or not self.SMTP_FROM_EMAIL:
                raise ValueError("SMTP_HOST et SMTP_FROM_EMAIL sont requis en production.")
            if not self.SMTP_USE_TLS:
                raise ValueError("SMTP_USE_TLS doit être activé en production.")
            if database_url:
                normalized_database_url = database_url
                if normalized_database_url.startswith("postgres://"):
                    normalized_database_url = (
                        "postgresql://" + normalized_database_url[len("postgres://"):]
                    )
                normalized_database_url = normalized_database_url.replace(
                    "postgresql+psycopg://", "postgresql://", 1
                )
                parsed_database = urlsplit(normalized_database_url)
                database_host = parsed_database.hostname
                sslmode = parse_qs(parsed_database.query).get("sslmode", [self.DB_SSLMODE])[-1]
            else:
                database_host = self.DB_HOST
                sslmode = self.DB_SSLMODE
            if not database_host or database_host.casefold() in {"localhost", "127.0.0.1", "::1"}:
                raise ValueError("La production doit utiliser une base PostgreSQL distante.")
            if sslmode not in {"require", "verify-ca", "verify-full"}:
                raise ValueError(
                    "PostgreSQL doit utiliser SSL en production (DB_SSLMODE=require minimum)."
                )

            frontend_host = urlsplit(self.FRONTEND_URL).hostname
            backend_host = urlsplit(self.BACKEND_URL).hostname
            if not frontend_host or not backend_host:
                raise ValueError("FRONTEND_URL et BACKEND_URL doivent contenir des domaines valides.")
            if frontend_host != backend_host:
                csrf_domain = (self.AUTH_CSRF_COOKIE_DOMAIN or "").lstrip(".").casefold()
                if not csrf_domain:
                    raise ValueError(
                        "AUTH_CSRF_COOKIE_DOMAIN est requis lorsque le frontend et le backend "
                        "utilisent des sous-domaines distincts."
                    )
                if not all(
                    host.casefold() == csrf_domain
                    or host.casefold().endswith(f".{csrf_domain}")
                    for host in (frontend_host, backend_host)
                ):
                    raise ValueError(
                        "AUTH_CSRF_COOKIE_DOMAIN doit être un domaine parent du frontend et du backend."
                    )
            if not self.backend_trusted_hosts or "*" in self.backend_trusted_hosts:
                raise ValueError(
                    "BACKEND_TRUSTED_HOSTS doit lister explicitement les domaines de production."
                )

            if (
                self.AI_ENABLED
                and self.AI_PROVIDER == "openai"
                and (
                    self.OPENAI_API_KEY is None
                    or not self.OPENAI_API_KEY.get_secret_value().strip()
                )
            ):
                raise ValueError(
                    "OPENAI_API_KEY est requise lorsque le fournisseur IA OpenAI "
                    "est activé en production."
                )
            if (
                self.AI_ENABLED
                and self.AI_PROVIDER == "openai"
                and (
                    self.AI_INPUT_COST_PER_MILLION_MICROUSD <= 0
                    or self.AI_OUTPUT_COST_PER_MILLION_MICROUSD <= 0
                )
            ):
                raise ValueError(
                    "Les tarifs du modèle IA doivent être configurés pour protéger "
                    "le budget en production."
                )
        return self


# Création d'une instance de Settings.
#
# C'est ici que Pydantic va :
#
# 1. Ouvrir le fichier .env
# 2. Lire chaque variable
# 3. Vérifier son type (str, int...)
# 4. Les stocker dans l'objet settings
#
# Si une variable manque ou si son type est incorrect,
# une erreur sera levée immédiatement.
settings = Settings()
