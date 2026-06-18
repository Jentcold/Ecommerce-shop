import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from dependencies import get_db, get_current_admin

from models.products import Product, ProductImage
from models.orders import Order, OrderItem, OrderStatus
from models.users import User
from models.settings import SiteSetting

from schemas.products import ProductCreate, ProductUpdate, ProductResponse, ProductImageResponse
from schemas.orders import OrderResponse, OrderSummaryResponse, OrderStatusUpdate

from utils.email import send_order_shipped_email

logger = logging.getLogger(__name__)

products_router = APIRouter(prefix="/admin/products", tags=["Admin — Products"])
orders_router   = APIRouter(prefix="/admin/orders",   tags=["Admin — Orders"])

VALID_TRANSITIONS = {
    OrderStatus.pending:    [OrderStatus.processing, OrderStatus.cancelled],
    OrderStatus.processing: [OrderStatus.shipped,    OrderStatus.cancelled],
    OrderStatus.shipped:    [OrderStatus.delivered],
    OrderStatus.delivered:  [],
    OrderStatus.cancelled:  [],
}


# ═════════════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═════════════════════════════════════════════════════════════════════════════

@products_router.get("/", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return db.query(Product).order_by(Product.id.desc()).all()


@products_router.get("/categories", response_model=list[str])
def get_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    rows = db.query(Product.category).distinct().filter(Product.category.isnot(None)).all()
    return sorted([r[0] for r in rows if r[0]])


@products_router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = Product(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        brand=payload.brand,
        price=payload.price,
        stock=payload.stock,
        discount=payload.discount,
        is_active=payload.is_active,
        is_featured=payload.is_featured,
    )
    db.add(product)
    db.flush()

    for url in payload.image_urls:
        db.add(ProductImage(product_id=product.id, url=url))

    db.commit()
    db.refresh(product)
    logger.info(f"Admin {admin.email} created product: {product.name}")
    return product


@products_router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = payload.model_dump(exclude_unset=True)

    new_image_urls = update_data.pop("image_urls", None)
    if new_image_urls is not None:
        db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
        for url in new_image_urls:
            db.add(ProductImage(product_id=product_id, url=url))

    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    logger.info(f"Admin {admin.email} updated product {product_id}")
    return product


@products_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    logger.info(f"Admin {admin.email} deleted product {product_id}")


@products_router.patch("/{product_id}/toggle-active", response_model=ProductResponse)
def toggle_active(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    logger.info(f"Admin {admin.email} toggled active on product {product_id} → {product.is_active}")
    return product


@products_router.patch("/{product_id}/toggle-featured", response_model=ProductResponse)
def toggle_featured(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_featured = not product.is_featured
    db.commit()
    db.refresh(product)
    logger.info(f"Admin {admin.email} toggled featured on product {product_id} → {product.is_featured}")
    return product


@products_router.post("/{product_id}/images", response_model=list[ProductImageResponse], status_code=status.HTTP_201_CREATED)
def add_images(
    product_id: int,
    image_urls: list[str],
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_images = [ProductImage(product_id=product_id, url=url) for url in image_urls]
    db.add_all(new_images)
    db.commit()
    for img in new_images:
        db.refresh(img)

    logger.info(f"Admin {admin.email} added {len(new_images)} image(s) to product {product_id}")
    return new_images


@products_router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id,
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    db.delete(image)
    db.commit()
    logger.info(f"Admin {admin.email} deleted image {image_id} from product {product_id}")


# ═════════════════════════════════════════════════════════════════════════════
# ORDERS
# ═════════════════════════════════════════════════════════════════════════════

@orders_router.get("/", response_model=list[OrderSummaryResponse])
def list_orders(
    status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # Show all orders to admin including pending (unpaid) — revenue calc excludes them
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    return query.order_by(Order.created_at.desc()).all()


@orders_router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@orders_router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed = VALID_TRANSITIONS.get(order.status, [])
    if payload.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move order from '{order.status.value}' to '{payload.status.value}'",
        )

    if payload.status == OrderStatus.cancelled:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity

    order.status = payload.status
    db.commit()
    db.refresh(order)
    
    if payload.status == OrderStatus.shipped:
        try:
            send_order_shipped_email(order.user.email, order)
        except Exception as e:
            logger.warning(f"Failed to send shipped email: {e}")

    logger.info(f"Admin {admin.email} moved order {order_id} → {payload.status.value}")
    return order



# ═════════════════════════════════════════════════════════════════════════════
# SETTINGS
# ═════════════════════════════════════════════════════════════════════════════

settings_router = APIRouter(prefix="/admin/settings", tags=["Admin — Settings"])


@settings_router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    rows = db.query(SiteSetting).all()
    return {r.key: r.value for r in rows}


@settings_router.patch("/{key}")
def update_setting(
    key: str,
    value: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    setting = db.query(SiteSetting).filter_by(key=key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    setting.value = value
    db.commit()
    return {key: value}