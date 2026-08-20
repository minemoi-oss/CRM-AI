from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.company import router as companies_router
from app.api.customer import router as customers_router
from app.api.health import router as health_router
from app.api.invoice import router as invoice_router
from app.api.payment import router as payment_router
from app.api.product import router as product_router
from app.api.prospect import router as prospect_router
from app.api.quote import router as quote_router
from app.api.quote_item import router as quote_item_router
from app.api.service import router as service_router
from app.core.config import settings
from app.dashboard.router import router as dashboard_router


production = settings.APP_ENV == "production"
app = FastAPI(
    title="Mine CRM AI API",
    version="1.0.0",
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
    openapi_url=None if production else "/openapi.json",
)

if production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.backend_trusted_hosts,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(settings.auth_allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
)

app.include_router(health_router)
app.include_router(customers_router)
app.include_router(companies_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(product_router)
app.include_router(service_router)
app.include_router(quote_router)
app.include_router(quote_item_router)
app.include_router(invoice_router)
app.include_router(payment_router)
app.include_router(prospect_router)
app.include_router(ai_router)


@app.middleware("http")
async def add_production_security_headers(request, call_next):
    response = await call_next(request)
    if production:
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


@app.get("/", tags=["System"])
def root():
    return {"service": "Mine CRM AI API", "status": "ok"}
