from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from dependencies import get_db
from models.products import Product
from models.settings import SiteSetting
from schemas.products import ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])


# ── All products ──────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ProductResponse])
def get_products(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.is_active == True)

    if category:
        query = query.filter(Product.category == category)

    return query.order_by(Product.id.desc()).all()


# ── Featured products ─────────────────────────────────────────────────────────

@router.get("/featured", response_model=list[ProductResponse])
def get_featured_products(db: Session = Depends(get_db)):
    return (
        db.query(Product)
        .filter(Product.is_active == True, Product.is_featured == True)
        .order_by(Product.id.desc())
        .all()
    )


# ── Search ────────────────────────────────────────────────────────────────────

@router.get("/search", response_model=list[ProductResponse])
def search_products(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    term = f"%{q}%"
    return (
        db.query(Product)
        .filter(
            Product.is_active == True,
            Product.name.ilike(term) | Product.description.ilike(term),
        )
        .order_by(Product.id.desc())
        .all()
    )


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[str])
def get_categories(db: Session = Depends(get_db)):
    """Public endpoint — returns all unique categories for shop filter buttons."""
    rows = db.query(Product.category).distinct().filter(
        Product.category.isnot(None),
        Product.is_active == True,
    ).all()
    return sorted([r[0] for r in rows if r[0]])


# ── Single product ────────────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


# ── Site settings ────────────────────────────────────────────────────────────

@router.get("/shop/settings")
def get_public_shop_settings(db: Session = Depends(get_db)):
    rows = db.query(SiteSetting).all()
    all_settings = {r.key: r.value for r in rows}
    
    return {
        "sale_active": all_settings.get("sale_active", "false")
    }