from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

StockStatus = Literal["in_stock", "low_stock", "out_of_stock"]
MovementReason = Literal["restock", "sale", "return", "adjustment", "damaged", "initial"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- categories ----------
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=255)


class CategoryOut(ORMModel):
    id: int
    name: str
    description: str | None
    product_count: int = 0


# ---------- products ----------
class ProductBase(BaseModel):
    sku: str = Field(min_length=2, max_length=40, pattern=r"^[A-Za-z0-9\-_]+$")
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    category_id: int | None = None
    reorder_level: int = Field(default=10, ge=0)
    unit_price: float = Field(default=0, ge=0)
    supplier: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=60)


class ProductCreate(ProductBase):
    quantity: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    """All fields optional. Quantity is changed through stock movements, not here."""

    sku: str | None = Field(default=None, min_length=2, max_length=40, pattern=r"^[A-Za-z0-9\-_]+$")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    category_id: int | None = None
    reorder_level: int | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=60)


class ProductOut(ORMModel):
    id: int
    sku: str
    name: str
    description: str | None
    category_id: int | None
    category_name: str | None
    quantity: int
    reorder_level: int
    unit_price: float
    supplier: str | None
    location: str | None
    status: StockStatus
    created_at: datetime
    updated_at: datetime


# ---------- stock movements ----------
class StockAdjust(BaseModel):
    change: int = Field(description="Positive to add stock, negative to remove it")
    reason: MovementReason
    note: str | None = Field(default=None, max_length=255)


class MovementOut(ORMModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str
    change: int
    quantity_after: int
    reason: str
    note: str | None
    created_at: datetime


# ---------- dashboard ----------
class CategoryValue(BaseModel):
    category: str
    value: float
    units: int


class StatsOut(BaseModel):
    total_products: int
    total_units: int
    inventory_value: float
    low_stock: int
    out_of_stock: int
    categories: int
    value_by_category: list[CategoryValue]
