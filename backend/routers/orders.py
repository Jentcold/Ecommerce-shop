import os, json, logging, httpx

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session, joinedload

from dependencies import get_db, get_current_user
from models.users import User
from models.products import Product
from models.orders import Order, OrderItem, OrderStatus, PaymentMethod
from schemas.orders import OrderCreate, OrderResponse, PaymentLinkResponse
from utils.email import send_order_confirmation_email

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])

SHIPPING_THRESHOLD   = 10.0
SHIPPING_COST        = 1.5
MYFATOORAH_BASE_URL  = os.getenv("MYFATOORAH_BASE_URL")
MYFATOORAH_API_TOKEN = os.getenv("MYFATOORAH_TOKEN")
FRONTEND_URL         = os.getenv("FRONTEND_URL")
BACKEND_URL          = os.getenv("BASE_URL")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_items(payload, db):
    """
    Validates every item exists, is active, and has enough stock.
    Returns (resolved, subtotal). Does NOT touch stock yet.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    resolved = []
    for item in payload.items:
        if item.quantity < 1:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for product {item.product_id}")

        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.is_active == True,
        ).first()

        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found or inactive")

        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for '{product.name}' — requested {item.quantity}, available {product.stock}",
            )
        resolved.append((item, product))

    subtotal = sum(
        (product.price * (1 - product.discount / 100.0) if product.discount else product.price) * item.quantity
        for item, product in resolved
    )
    return resolved, subtotal


def _deduct_stock(resolved, db):
    """Deducts stock only after payment is confirmed."""
    for item, product in resolved:
        # Re-query to get fresh stock value
        fresh = db.query(Product).filter(Product.id == product.id).first()
        if fresh:
            fresh.stock -= item.quantity


# ── Initiate payment ──────────────────────────────────────────────────────────

@router.post("/initiate-payment", response_model=PaymentLinkResponse)
async def initiate_payment(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Step 1 of the payment flow.
    Validates the cart, saves a PENDING order (not visible to admin yet),
    then sends to MyFatoorah. Stock is NOT deducted here.
    """
    resolved, subtotal = _validate_items(payload, db)
    shipping = 0.0 if subtotal >= SHIPPING_THRESHOLD else SHIPPING_COST
    total    = subtotal + shipping

    # Save order as pending — admin won't see this yet
    order = Order(
        user_id=current_user.id,
        status=OrderStatus.pending,   # awaiting payment
        subtotal=subtotal,
        shipping=shipping,
        total=total,
        shipping_address=payload.shipping_address,
        phone=payload.phone,
        notes=payload.notes,
        payment_method=PaymentMethod.myfatoorah,  # hardcoded — ignore client value
    )
    db.add(order)
    db.flush()  # get order.id without committing

    # Save items with price snapshots
    for item, product in resolved:
        db.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            size=item.size,
            price_at_purchase=product.price,
            discount_at_purchase=product.discount,
        ))

    db.commit()
    db.refresh(order)
    logger.info(f"Pending order {order.id} created for user {current_user.id} — KWD {total}")

    # Send to MyFatoorah
    myfatoorah_payload = {
        "Order": {
            "Amount":              round(total, 3),
            "Currency":            "KWD",
            "ExternalIdentifier":  str(order.id),  # our DB order ID
        },
        "Customer": {
            "Mobile": {
                "CountryCode": "+965",
                "Number":      payload.phone.replace("+965", "").replace(" ", "")[:8],
            },
            "Email": current_user.email,
            "Name":  current_user.username,
        },
        "IntegrationUrls": {
            "Redirection": f"{BACKEND_URL}/orders/callback/success",
        },
        "NotificationOption": "EMAIL",
        "MetaData": {"UDF1": str(order.id)},
    }

    headers = {
        "accept":        "application/json",
        "content-type":  "application/json",
        "authorization": f"Bearer {MYFATOORAH_API_TOKEN}",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{MYFATOORAH_BASE_URL}/payments",
                json=myfatoorah_payload,
                headers=headers,
                timeout=15.0,
            )
            res_data = response.json()

            if not response.is_success or not res_data.get("IsSuccess"):
                # Payment gateway rejected — delete the pending order so it doesn't litter the DB
                db.delete(order)
                db.commit()
                errors = res_data.get("ValidationErrors") or []
                msg    = errors[0].get("Error") if errors else res_data.get("Message", "Payment gateway error")
                logger.error(f"MyFatoorah error: {res_data}")
                raise HTTPException(status_code=400, detail=msg)

            payment_url = res_data.get("Data", {}).get("PaymentURL")
            if not payment_url:
                db.delete(order)
                db.commit()
                raise HTTPException(status_code=502, detail="Missing PaymentURL in gateway response")

            return {"payment_url": payment_url}

        except httpx.RequestError as e:
            db.delete(order)
            db.commit()
            raise HTTPException(status_code=502, detail=f"Gateway connection error: {str(e)}")


# ── MyFatoorah callback ───────────────────────────────────────────────────────

@router.get("/callback/success")
async def payment_callback_success(paymentId: str, Id: str = None, db: Session = Depends(get_db)):
    """
    Step 2 — MyFatoorah redirects here after the user pays.
    We verify with MyFatoorah, then:
    - Move order from pending → processing
    - Deduct stock
    - Send confirmation email
    """
    headers = {
        "accept":        "application/json",
        "authorization": f"Bearer {MYFATOORAH_API_TOKEN}",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{MYFATOORAH_BASE_URL}/payments/{paymentId}",
                headers=headers,
                timeout=15.0,
            )
            res_data = response.json()
            print(f"data :{res_data}")

            if not response.is_success or not res_data.get("IsSuccess"):
                logger.error(f"MyFatoorah verification failed: {res_data}")
                return RedirectResponse(f"{FRONTEND_URL}/checkout?error=verification_failed", status_code=303)

            data    = res_data.get("Data", {})
            invoice = data.get("Invoice", {})
            print(f"data : {data}")
            print(f"invoice : {invoice}")
            print(invoice.get("Status"))

            # Verify payment status
            if invoice.get("Status") != "PAID":
                logger.warning(f"Payment {paymentId} status: {invoice.get('Status')}")
                return RedirectResponse(f"{FRONTEND_URL}/checkout?error=unpaid", status_code=303)

            # Find our order using ExternalIdentifier we set earlier
            order_id = invoice.get("ExternalIdentifier") or data.get("MetaData", {}).get("UDF1")
            if not order_id:
                logger.error("Missing ExternalIdentifier/UDF1 from MyFatoorah callback")
                return RedirectResponse(f"{FRONTEND_URL}/checkout?error=missing_reference", status_code=303)

            order = db.query(Order).options(
                joinedload(Order.items).joinedload(OrderItem.product)
            ).filter(Order.id == int(order_id)).first()

            if not order:
                logger.error(f"Order {order_id} not found in DB")
                return RedirectResponse(f"{FRONTEND_URL}/checkout?error=order_not_found", status_code=303)

            if order.status != OrderStatus.pending:
                # Already processed (duplicate callback) — just redirect
                logger.warning(f"Order {order_id} already processed, status: {order.status}")
                return RedirectResponse(f"{FRONTEND_URL}/account?order=placed", status_code=303)

            # ── Payment confirmed — now commit everything ──────────────────
            order.status              = OrderStatus.processing  
            order.gateway_invoice_id  = invoice.get("Id") or paymentId

            # Deduct stock now that payment is confirmed
            for item in order.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    if product.stock < item.quantity:
                        logger.warning(f"Stock conflict on product {item.product_id} — oversold")
                    product.stock = max(0, product.stock - item.quantity)

            db.commit()
            db.refresh(order)
            logger.info(f"Order {order.id} payment confirmed — moved to processing")

            # Send confirmation email
            user = db.query(User).filter(User.id == order.user_id).first()
            if user:
                try:
                    send_order_confirmation_email(user.email, order)
                except Exception as e:
                    logger.warning(f"Confirmation email failed: {e}")

            return RedirectResponse(f"{FRONTEND_URL}/account?order=placed", status_code=303)

        except Exception as e:
            logger.error(f"Callback crash: {e}", exc_info=True)
            return RedirectResponse(f"{FRONTEND_URL}/checkout?error=server_error", status_code=303)


# ── Get own orders ────────────────────────────────────────────────────────────

@router.get("/", response_model=list[OrderResponse])
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all orders for the current user except abandoned pending ones."""
    return (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(
            Order.user_id == current_user.id,
            Order.status != OrderStatus.pending,  # hide unpaid orders from user too
        )
        .order_by(Order.created_at.desc())
        .all()
    )


# ── Get single order ──────────────────────────────────────────────────────────

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(
        Order.id == order_id,
        Order.user_id == current_user.id,
        Order.status != OrderStatus.pending,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── Cancel own order ──────────────────────────────────────────────────────────

@router.patch("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).options(
        joinedload(Order.items)
    ).filter(
        Order.id == order_id,
        Order.user_id == current_user.id,
        Order.status != OrderStatus.pending,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in (OrderStatus.processing,):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel an order that is already {order.status.value}",
        )

    # Restore stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity

    order.status = OrderStatus.cancelled
    db.commit()
    db.refresh(order)
    logger.info(f"Order {order.id} cancelled by user {current_user.id}")
    return order