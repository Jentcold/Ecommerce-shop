from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


class OrderStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    shipped    = "shipped"
    delivered  = "delivered"
    cancelled  = "cancelled"


# ── Added myfatoorah option to the Enum ───────────────────────────────────────
class PaymentMethod(str, enum.Enum):
    cash       = "cash"
    card       = "card"
    myfatoorah = "myfatoorah" 


class Order(Base):
    __tablename__ = "orders"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status     = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)

    subtotal   = Column(Float, nullable=False)
    shipping   = Column(Float, nullable=False, default=0.0)
    total      = Column(Float, nullable=False)

    shipping_address = Column(String, nullable=False)
    phone            = Column(String, nullable=False)
    notes            = Column(String, nullable=True)
    
    payment_method   = Column(Enum(PaymentMethod), default=PaymentMethod.myfatoorah, nullable=False)
    
    gateway_invoice_id = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    user  = relationship("User", backref="orders")


class OrderItem(Base):
    __tablename__ = "order_items"

    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    quantity   = Column(Integer, nullable=False)
    size       = Column(String, nullable=True)

    # Snapshot of price at time of purchase — never recalculate from product
    price_at_purchase      = Column(Float, nullable=False)
    discount_at_purchase   = Column(Float, nullable=True)

    order   = relationship("Order", back_populates="items")
    product = relationship("Product")
    