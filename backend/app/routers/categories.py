from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, Product
from app.schemas import CategoryCreate, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Category, func.count(Product.id))
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name)
    ).all()
    return [
        CategoryOut(id=c.id, name=c.name, description=c.description, product_count=n)
        for c, n in rows
    ]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if db.scalar(select(Category).where(func.lower(Category.name) == name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Category '{name}' already exists")
    category = Category(name=name, description=payload.description)
    db.add(category)
    db.commit()
    return CategoryOut(id=category.id, name=category.name, description=category.description)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    # Products are kept; they simply become uncategorised.
    for product in category.products:
        product.category_id = None
    db.delete(category)
    db.commit()
