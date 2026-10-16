from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.metrics import INVENTORY_VALUE, LOW_STOCK_PRODUCTS
from app.models import Category, Product
from app.schemas import CategoryValue, StatsOut

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    value = Product.quantity * Product.unit_price
    total, units, inventory_value, low, out = db.execute(
        select(
            func.count(Product.id),
            func.coalesce(func.sum(Product.quantity), 0),
            func.coalesce(func.sum(value), 0),
            func.coalesce(
                func.sum(
                    case(
                        (
                            (Product.quantity > 0) & (Product.quantity <= Product.reorder_level),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(func.sum(case((Product.quantity <= 0, 1), else_=0)), 0),
        )
    ).one()

    by_category = db.execute(
        select(
            func.coalesce(Category.name, "Uncategorised"),
            func.coalesce(func.sum(value), 0),
            func.coalesce(func.sum(Product.quantity), 0),
        )
        .select_from(Product)
        .outerjoin(Category, Product.category_id == Category.id)
        .group_by(Category.name)
        .order_by(func.coalesce(func.sum(value), 0).desc())
    ).all()

    LOW_STOCK_PRODUCTS.set(int(low) + int(out))
    INVENTORY_VALUE.set(float(inventory_value))

    return StatsOut(
        total_products=total,
        total_units=int(units),
        inventory_value=round(float(inventory_value), 2),
        low_stock=int(low),
        out_of_stock=int(out),
        categories=db.scalar(select(func.count(Category.id))) or 0,
        value_by_category=[
            CategoryValue(category=name, value=round(float(v), 2), units=int(u))
            for name, v, u in by_category
        ],
    )
