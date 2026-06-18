from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime
from models.orders import OrderStatus, PaymentMethod  

# ── Incoming from client ──────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: int
    quantity:   int
    size:       Optional[str] = None


class OrderCreate(BaseModel):
    items:            list[OrderItemCreate]
    shipping_address: str
    phone:            str
    notes:            Optional[str] = None
    payment_method:   PaymentMethod = PaymentMethod.myfatoorah


# ── Status update (admin only) ────────────────────────────────────────────────

class OrderStatusUpdate(BaseModel):
    status: OrderStatus


# ── Responses ─────────────────────────────────────────────────────────────────

class PaymentLinkResponse(BaseModel):
    payment_url: str


class OrderItemResponse(BaseModel):
    id:                   int
    product_id:           int
    quantity:             int
    size:                 Optional[str]
    price_at_purchase:    float
    discount_at_purchase: Optional[float]
    product_name:         Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_product_name(cls, data):
        if hasattr(data, "product") and data.product:
            setattr(data, "product_name", data.product.name)
        elif isinstance(data, dict) and "product" in data and data["product"]:
            data["product_name"] = data["product"].get("name")
        return data

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id:               int
    status:           OrderStatus
    subtotal:         float
    shipping:         float
    total:            float
    shipping_address: str
    phone:            str
    notes:            Optional[str]
    payment_method:   Optional[PaymentMethod] = None
    gateway_invoice_id: Optional[str] = None 
    created_at:       datetime
    updated_at:       datetime
    items:            list[OrderItemResponse]

    model_config = {"from_attributes": True}


class OrderSummaryResponse(BaseModel):
    id:               int
    status:           OrderStatus
    total:            float
    phone:            str
    shipping_address: str
    payment_method:   Optional[PaymentMethod] = None
    created_at:       datetime

    model_config = {"from_attributes": True}