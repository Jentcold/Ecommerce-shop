from pydantic import BaseModel
from typing import Optional


class ProductImageCreate(BaseModel):
    url: str


class ProductImageResponse(BaseModel):
    id: int
    url: str

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    description: str
    section: str
    category: str
    brand: Optional[str] = None
    price: float
    stock: int
    discount: Optional[float] = None
    is_active: bool = True
    is_featured: bool = False
    image_urls: list[str] = []
    sizes: list[str] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    section: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    discount: Optional[float] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    image_urls: Optional[list[str]] = None
    sizes: Optional[list[str]] = None 


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    section: str
    category: str
    brand: Optional[str]
    price: float
    stock: int
    discount: Optional[float]
    is_active: bool
    is_featured: bool
    sizes: list[str] = []  
    images: list[ProductImageResponse] = []

    model_config = {"from_attributes": True}

class PaginatedProducts(BaseModel):
    items: list[ProductResponse]
    has_more: bool