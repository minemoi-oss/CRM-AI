from sqlalchemy import URL, create_engine, make_url
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def build_database_url() -> str:
    """Build one psycopg URL for local credentials or a managed database URL."""
    if settings.DATABASE_URL is not None:
        raw_url = settings.DATABASE_URL.get_secret_value().strip()
        if raw_url.startswith("postgres://"):
            raw_url = "postgresql://" + raw_url[len("postgres://"):]
        url = make_url(raw_url)
        if url.drivername in {"postgres", "postgresql"}:
            url = url.set(drivername="postgresql+psycopg")
    else:
        assert settings.DB_NAME is not None
        assert settings.DB_USER is not None
        assert settings.DB_PASSWORD is not None
        assert settings.DB_HOST is not None
        url = URL.create(
            "postgresql+psycopg",
            username=settings.DB_USER,
            password=settings.DB_PASSWORD.get_secret_value(),
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            database=settings.DB_NAME,
        )

    if "sslmode" not in url.query:
        url = url.update_query_dict({"sslmode": settings.DB_SSLMODE})
    return url.render_as_string(hide_password=False)


DATABASE_URL = build_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_use_lifo=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT_SECONDS,
    pool_recycle=settings.DB_POOL_RECYCLE_SECONDS,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
