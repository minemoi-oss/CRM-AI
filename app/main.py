from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.customer import router as customers_router
from app.api.company import router as companies_router
from app.api.auth import router as auth_router
from app.dashboard.router import router as dashboard_router

from app.api.product import router as product_router
from app.api.service import router as service_router

from app.api.quote import router as quote_router
from app.api.quote_item import router as quote_item_router

from app.api.invoice import router as invoice_router
from app.api.payment import router as payment_router

app = FastAPI()
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


#Conexion frontend React
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Bienvenue sur Portfolio API 🚀"}

