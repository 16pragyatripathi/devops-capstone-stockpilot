"""seed a small demo catalogue so the dashboard is not empty on first run

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-16
"""
import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

CATEGORIES = [
    (1, "Electronics", "Devices, peripherals and accessories"),
    (2, "Office Supplies", "Stationery and desk essentials"),
    (3, "Furniture", "Chairs, desks and storage"),
    (4, "Networking", "Routers, switches and cabling"),
]

# sku, name, category_id, quantity, reorder_level, unit_price, supplier, location
PRODUCTS = [
    ("ELEC-1001", "Wireless Mouse", 1, 142, 30, 24.99, "Logitech India", "A1-03"),
    ("ELEC-1002", "Mechanical Keyboard", 1, 18, 20, 79.00, "Keychron", "A1-04"),
    ("ELEC-1003", "27\" 4K Monitor", 1, 9, 5, 329.00, "Dell Technologies", "B2-01"),
    ("ELEC-1004", "USB-C Docking Station", 1, 0, 8, 149.50, "Anker", "A2-07"),
    ("OFF-2001", "A4 Copier Paper (500)", 2, 640, 100, 5.40, "JK Paper", "C1-01"),
    ("OFF-2002", "Gel Pens (Box of 12)", 2, 35, 40, 6.25, "Pilot", "C1-05"),
    ("OFF-2003", "Sticky Notes Pack", 2, 210, 50, 3.10, "3M", "C1-06"),
    ("FUR-3001", "Ergonomic Office Chair", 3, 12, 4, 289.00, "Featherlite", "D1-02"),
    ("FUR-3002", "Standing Desk Frame", 3, 3, 3, 410.00, "Godrej Interio", "D1-04"),
    ("NET-4001", "Cat6 Patch Cable 2m", 4, 0, 50, 4.80, "D-Link", "E1-01"),
    ("NET-4002", "24-Port Gigabit Switch", 4, 7, 2, 189.00, "TP-Link", "E2-03"),
    ("NET-4003", "Wi-Fi 6 Access Point", 4, 22, 6, 139.00, "Ubiquiti", "E2-05"),
]


def upgrade() -> None:
    categories = sa.table(
        "categories", sa.column("id", sa.Integer), sa.column("name", sa.String), sa.column("description", sa.String)
    )
    products = sa.table(
        "products",
        sa.column("sku", sa.String),
        sa.column("name", sa.String),
        sa.column("category_id", sa.Integer),
        sa.column("quantity", sa.Integer),
        sa.column("reorder_level", sa.Integer),
        sa.column("unit_price", sa.Numeric),
        sa.column("supplier", sa.String),
        sa.column("location", sa.String),
    )
    op.bulk_insert(categories, [dict(id=i, name=n, description=d) for i, n, d in CATEGORIES])
    op.bulk_insert(
        products,
        [
            dict(sku=s, name=n, category_id=c, quantity=q, reorder_level=r, unit_price=p, supplier=sup, location=loc)
            for s, n, c, q, r, p, sup, loc in PRODUCTS
        ],
    )
    # Explicit ids were used above, so move the sequence past them (PostgreSQL only).
    if op.get_bind().dialect.name == "postgresql":
        op.execute("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))")
    op.execute(
        "INSERT INTO stock_movements (product_id, change, quantity_after, reason, note) "
        "SELECT id, quantity, quantity, 'initial', 'Opening stock' FROM products WHERE quantity > 0"
    )


def downgrade() -> None:
    op.execute("DELETE FROM stock_movements")
    op.execute("DELETE FROM products")
    op.execute("DELETE FROM categories")
