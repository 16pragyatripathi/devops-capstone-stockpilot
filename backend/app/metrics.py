"""Business metrics exposed on /metrics next to the HTTP metrics."""

from prometheus_client import Counter, Gauge

STOCK_MOVEMENTS = Counter(
    "stockpilot_stock_movements_total",
    "Stock movements recorded, by reason",
    ["reason"],
)
UNITS_MOVED = Counter(
    "stockpilot_units_moved_total",
    "Absolute number of units moved, by direction",
    ["direction"],
)
LOW_STOCK_PRODUCTS = Gauge(
    "stockpilot_low_stock_products",
    "Products at or below their reorder level (refreshed on each stats call)",
)
INVENTORY_VALUE = Gauge(
    "stockpilot_inventory_value",
    "Total value of stock on hand (refreshed on each stats call)",
)
