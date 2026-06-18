from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    product_id: int
    order_id:   int
    rating:     int = Field(..., ge=1, le=5)
    comment:    Optional[str] = None


class ReviewResponse(BaseModel):
    id:         int
    product_id: int
    user_id:    int
    order_id:   int
    rating:     int
    comment:    Optional[str]
    created_at: datetime
    username:   Optional[str] = None
    product_name: Optional[str] = None

    model_config = {"from_attributes": True}