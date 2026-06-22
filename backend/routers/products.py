from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from dependencies import get_db
from models.products import Product
from models.settings import SiteSetting
from schemas.products import ProductResponse,PaginatedProducts

router = APIRouter(prefix="/products", tags=["Products"])


# ── All products ──────────────────────────────────────────────────────────────

@router.get("/", response_model=PaginatedProducts)
def get_products(
    category: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.is_active == True)

    if section:
        query = query.filter(Product.section == section)

    if category:
        query = query.filter(Product.category == category)

    items = query.order_by(Product.id.desc()).offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    return {"items": items[:limit],"has_more": has_more}

# ── ON Sale products ─────────────────────────────────────────────────────────

@router.get("/on-sale", response_model=PaginatedProducts)
def get_sale_products(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(
        Product.is_active == True,
        Product.is_featured == True,
        Product.discount.isnot(None),
        Product.discount > 0
    ).order_by(Product.discount.desc(), Product.id.desc())

    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    return {"items": items[:limit],"has_more": has_more}


# ── Featured products ─────────────────────────────────────────────────────────

@router.get("/featured", response_model=PaginatedProducts)
def get_featured_products(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
    ):
    query = db.query(Product).filter(
        Product.is_active == True, 
        Product.discount != None).order_by(Product.id.desc())
    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    return {"items": items[:limit],"has_more": has_more}

# ── Search ────────────────────────────────────────────────────────────────────

@router.get("/search",response_model=PaginatedProducts)
def search_products(
    category: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    term = f"%{q}%"
    query = db.query(Product).filter(
        Product.is_active == True,
        Product.name.ilike(term) | Product.description.ilike(term) | Product.section.ilike(term) | Product.category.ilike(term)).order_by(Product.id.desc())
    if section:
        query = query.filter(Product.section == section)

    if category:
        query = query.filter(Product.category == category) 
    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    return {"items": items[:limit],"has_more": has_more}

# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[str])
def get_categories(section: Optional[str] = None, db: Session = Depends(get_db)):
    """Public endpoint — returns all unique categories for shop filter options."""
    query = db.query(Product.category).distinct().filter(Product.category.isnot(None),Product.is_active == True)
    if section:
        query = query.filter(Product.section == section)
    rows = query.all()
    return sorted([r[0] for r in rows if r[0]])

# ── Sections ────────────────────────────────────────────────────────────────

@router.get("/sections", response_model=list[str])
def get_sections(db: Session = Depends(get_db)):
    """Public endpoint — returns all unique Sections for shop filter dropdown."""
    rows = db.query(Product.section).distinct().filter(
        Product.section.isnot(None),
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