import logging
import os
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, SessionLocal
from models import users, products, orders, settings, reviews  # noqa: F401
from models.settings import SiteSetting

from routers.users     import router as users_router
from routers.products import router as products_router
from routers.orders   import router as orders_router
from routers.reviews  import router as reviews_router
from routers.admin    import products_router as admin_products_router
from routers.admin    import orders_router   as admin_orders_router
from routers.admin    import settings_router as admin_settings_router
from routers.upload   import router as upload_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Hadeel Aljazeeraa API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # Seed default settings if not present
    db = SessionLocal()
    try:
        if not db.query(SiteSetting).filter_by(key="sale_active").first():
            db.add(SiteSetting(key="sale_active", value="false"))
            db.commit()
    finally:
        db.close()
    logger.info("Database ready")


app.include_router(users_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(reviews_router)
app.include_router(admin_products_router)
app.include_router(admin_orders_router)
app.include_router(admin_settings_router)
app.include_router(upload_router)

# Serve uploaded images smoothly via static asset middleware mount
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)