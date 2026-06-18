from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Review(Base):
    __tablename__ = "reviews"

    id         = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id"), nullable=False)

    rating     = Column(Integer, nullable=False)  # 1-5
    comment    = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    is_visible = Column(Boolean, default=True)

    product = relationship("Product", backref="reviews")
    user    = relationship("User", backref="reviews")
    order   = relationship("Order", backref="reviews")