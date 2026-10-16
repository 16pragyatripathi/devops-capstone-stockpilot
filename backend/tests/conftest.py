"""Tests run against an in-memory SQLite database, never the real PostgreSQL."""

import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def client():
    Base.metadata.create_all(engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def category(client):
    return client.post("/api/categories", json={"name": "Electronics"}).json()


@pytest.fixture()
def product(client, category):
    payload = {
        "sku": "ELEC-1",
        "name": "Wireless Mouse",
        "category_id": category["id"],
        "quantity": 50,
        "reorder_level": 10,
        "unit_price": 20.0,
        "supplier": "Logitech",
    }
    return client.post("/api/products", json=payload).json()
