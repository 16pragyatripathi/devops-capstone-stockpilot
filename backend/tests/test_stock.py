def test_restock_and_sale_update_quantity(client, product):
    url = f"/api/products/{product['id']}/adjust"
    assert client.post(url, json={"change": 25, "reason": "restock"}).json()["quantity"] == 75
    sold = client.post(url, json={"change": -70, "reason": "sale", "note": "Order #42"}).json()
    assert sold["quantity"] == 5
    assert sold["status"] == "low_stock"


def test_cannot_remove_more_than_in_stock(client, product):
    response = client.post(f"/api/products/{product['id']}/adjust", json={"change": -51, "reason": "sale"})
    assert response.status_code == 400
    assert client.get(f"/api/products/{product['id']}").json()["quantity"] == 50


def test_zero_change_and_bad_reason_rejected(client, product):
    url = f"/api/products/{product['id']}/adjust"
    assert client.post(url, json={"change": 0, "reason": "sale"}).status_code == 422
    assert client.post(url, json={"change": 5, "reason": "magic"}).status_code == 422


def test_movements_are_recorded(client, product):
    client.post(f"/api/products/{product['id']}/adjust", json={"change": -50, "reason": "sale"})
    movements = client.get("/api/movements").json()
    assert [(m["change"], m["reason"]) for m in movements] == [(-50, "sale"), (50, "initial")]
    assert movements[0]["quantity_after"] == 0
    assert movements[0]["product_sku"] == "ELEC-1"


def test_stats(client, product):
    client.post("/api/products", json={"sku": "Z-1", "name": "Cable", "quantity": 0, "unit_price": 3})
    client.post("/api/products", json={"sku": "Z-2", "name": "Adapter", "quantity": 2, "unit_price": 10})
    stats = client.get("/api/stats").json()
    assert stats["total_products"] == 3
    assert stats["total_units"] == 52
    assert stats["inventory_value"] == 1020.0
    assert stats["low_stock"] == 1
    assert stats["out_of_stock"] == 1
    assert stats["categories"] == 1
    assert {c["category"] for c in stats["value_by_category"]} == {"Electronics", "Uncategorised"}
