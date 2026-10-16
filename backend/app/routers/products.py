from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.metrics import STOCK_MOVEMENTS, UNITS_MOVED
from app.models import Category, Product, StockMovement
from app.schemas import MovementOut, ProductCreate, ProductOut, ProductUpdate, StockAdjust

router = APIRouter(prefix="/api", tags=["products"])


def _get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


def _check_category(db: Session, category_id: int | None) -> None:
    if category_id is not None and not db.get(Category, category_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Category does not exist")


def _check_sku_free(db: Session, sku: str, exclude_id: int | None = None) -> None:
    query = select(Product.id).where(Product.sku == sku)
    if exclude_id is not None:
        query = query.where(Product.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(status.HTTP_409_CONFLICT, f"SKU '{sku}' is already in use")


def _record_movement(db: Session, product: Product, change: int, reason: str, note: str | None):
    db.add(
        StockMovement(
            product=product, change=change, quantity_after=product.quantity, reason=reason, note=note
        )
    )
    STOCK_MOVEMENTS.labels(reason=reason).inc()
    UNITS_MOVED.labels(direction="in" if change > 0 else "out").inc(abs(change))


@router.get("/products", response_model=list[ProductOut])
def list_products(
    q: str | None = Query(default=None, description="Search by name, SKU or supplier"),
    category_id: int | None = None,
    stock_status: Literal["in_stock", "low_stock", "out_of_stock"] | None = Query(
        default=None, alias="status"
    ),
    db: Session = Depends(get_db),
):
    query = select(Product).options(selectinload(Product.category)).order_by(Product.name)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.supplier.ilike(like))
        )
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if stock_status == "out_of_stock":
        query = query.where(Product.quantity <= 0)
    elif stock_status == "low_stock":
        query = query.where(Product.quantity > 0, Product.quantity <= Product.reorder_level)
    elif stock_status == "in_stock":
        query = query.where(Product.quantity > Product.reorder_level)
    return db.scalars(query).all()


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _get_product(db, product_id)


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    _check_category(db, payload.category_id)
    _check_sku_free(db, payload.sku)
    product = Product(**payload.model_dump())
    db.add(product)
    if product.quantity:
        _record_movement(db, product, product.quantity, "initial", "Opening stock")
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = _get_product(db, product_id)
    changes = payload.model_dump(exclude_unset=True)
    if "category_id" in changes:
        _check_category(db, changes["category_id"])
    if changes.get("sku"):
        _check_sku_free(db, changes["sku"], exclude_id=product_id)
    for key, value in changes.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db.delete(_get_product(db, product_id))
    db.commit()


@router.post("/products/{product_id}/adjust", response_model=ProductOut)
def adjust_stock(product_id: int, payload: StockAdjust, db: Session = Depends(get_db)):
    if payload.change == 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Change must not be zero")
    product = _get_product(db, product_id)
    new_quantity = product.quantity + payload.change
    if new_quantity < 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Only {product.quantity} units in stock; cannot remove {-payload.change}",
        )
    product.quantity = new_quantity
    _record_movement(db, product, payload.change, payload.reason, payload.note)
    db.commit()
    db.refresh(product)
    return product


@router.get("/movements", response_model=list[MovementOut])
def list_movements(
    product_id: int | None = None,
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = (
        select(StockMovement)
        .options(selectinload(StockMovement.product))
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        .limit(limit)
    )
    if product_id is not None:
        query = query.where(StockMovement.product_id == product_id)
    return db.scalars(query).all()
